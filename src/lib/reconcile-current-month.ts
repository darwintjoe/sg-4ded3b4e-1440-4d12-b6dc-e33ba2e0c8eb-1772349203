/**
 * One-Time Reconciliation Script for Current Month (2026-01)
 * Rebuilds daily and monthly summaries from actual transactions
 */

import { db } from "./db";

export interface ReconciliationResult {
  success: boolean;
  month: string;
  transactionsProcessed: number;
  dailySummariesCreated: number;
  monthlySummaryUpdated: boolean;
  before: {
    monthlyTotal: number;
    dailyTotal: number;
    difference: number;
  };
  after: {
    monthlyTotal: number;
    dailyTotal: number;
    difference: number;
  };
  errors: string[];
}

export async function reconcileCurrentMonth(): Promise<ReconciliationResult> {
  const errors: string[] = [];
  const currentMonth = "2026-01";
  
  try {
    console.log(`🔄 Starting reconciliation for ${currentMonth}...`);

    // Step 1: Get current state (before reconciliation)
    const monthlyBefore = await db.monthlySummaries
      .where("yearMonth")
      .equals(currentMonth)
      .first();
    
    const dailiesBefore = await db.dailySummaries
      .where("date")
      .between(`${currentMonth}-01`, `${currentMonth}-31`, true, true)
      .toArray();
    
    const dailyTotalBefore = dailiesBefore.reduce((sum, d) => sum + d.totalRevenue, 0);
    const monthlyTotalBefore = monthlyBefore?.totalRevenue || 0;

    console.log(`📊 Before: Monthly=${monthlyTotalBefore}, Daily=${dailyTotalBefore}, Diff=${monthlyTotalBefore - dailyTotalBefore}`);

    // Step 2: Get all transactions for current month
    const transactions = await db.transactions
      .where("timestamp")
      .between(
        new Date(`${currentMonth}-01T00:00:00`).getTime(),
        new Date(`${currentMonth}-31T23:59:59`).getTime(),
        true,
        true
      )
      .toArray();

    console.log(`📝 Found ${transactions.length} transactions in ${currentMonth}`);

    // Step 3: Group transactions by date
    const transactionsByDate = new Map<string, typeof transactions>();
    
    for (const txn of transactions) {
      const date = new Date(txn.timestamp).toISOString().split("T")[0];
      if (!transactionsByDate.has(date)) {
        transactionsByDate.set(date, []);
      }
      transactionsByDate.get(date)!.push(txn);
    }

    console.log(`📅 Transactions span ${transactionsByDate.size} days`);

    // Step 4: Rebuild daily summaries
    let dailySummariesCreated = 0;
    
    for (const [date, dayTxns] of transactionsByDate) {
      // Calculate totals from transactions
      const totalRevenue = dayTxns.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalReceipts = dayTxns.length;
      
      // Calculate payment method totals
      const cashTotal = dayTxns
        .filter(t => t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      const qrisStaticTotal = dayTxns
        .filter(t => t.paymentMethod === "qris_static")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      const qrisDynamicTotal = dayTxns
        .filter(t => t.paymentMethod === "qris_dynamic")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      const voucherTotal = dayTxns
        .filter(t => t.paymentMethod === "voucher")
        .reduce((sum, t) => sum + t.totalAmount, 0);

      // Count item quantities sold
      const itemQuantities = new Map<number, number>();
      for (const txn of dayTxns) {
        for (const item of txn.items) {
          const current = itemQuantities.get(item.itemId) || 0;
          itemQuantities.set(item.itemId, current + item.quantity);
        }
      }

      // Create/update daily summary
      const dailySummary = {
        date,
        totalRevenue,
        totalReceipts,
        cashTotal,
        qrisStaticTotal,
        qrisDynamicTotal,
        voucherTotal,
        itemQuantities: Array.from(itemQuantities.entries()).map(([itemId, quantity]) => ({
          itemId,
          quantity,
        })),
      };

      await db.dailySummaries.put(dailySummary);
      dailySummariesCreated++;
    }

    console.log(`✅ Created/updated ${dailySummariesCreated} daily summaries`);

    // Step 5: Rebuild monthly summary from corrected daily summaries
    const dailiesAfter = await db.dailySummaries
      .where("date")
      .between(`${currentMonth}-01`, `${currentMonth}-31`, true, true)
      .toArray();

    const totalRevenue = dailiesAfter.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalReceipts = dailiesAfter.reduce((sum, d) => sum + d.totalReceipts, 0);
    const cashTotal = dailiesAfter.reduce((sum, d) => sum + d.cashTotal, 0);
    const qrisStaticTotal = dailiesAfter.reduce((sum, d) => sum + d.qrisStaticTotal, 0);
    const qrisDynamicTotal = dailiesAfter.reduce((sum, d) => sum + d.qrisDynamicTotal, 0);
    const voucherTotal = dailiesAfter.reduce((sum, d) => sum + d.voucherTotal, 0);

    // Aggregate item quantities across all days
    const monthlyItemQuantities = new Map<number, number>();
    for (const daily of dailiesAfter) {
      for (const item of daily.itemQuantities) {
        const current = monthlyItemQuantities.get(item.itemId) || 0;
        monthlyItemQuantities.set(item.itemId, current + item.quantity);
      }
    }

    const monthlySummary = {
      yearMonth: currentMonth,
      totalRevenue,
      totalReceipts,
      cashTotal,
      qrisStaticTotal,
      qrisDynamicTotal,
      voucherTotal,
      itemQuantities: Array.from(monthlyItemQuantities.entries()).map(([itemId, quantity]) => ({
        itemId,
        quantity,
      })),
    };

    await db.monthlySummaries.put(monthlySummary);

    console.log(`✅ Updated monthly summary for ${currentMonth}`);

    // Step 6: Get final state (after reconciliation)
    const monthlyAfter = await db.monthlySummaries
      .where("yearMonth")
      .equals(currentMonth)
      .first();
    
    const dailyTotalAfter = dailiesAfter.reduce((sum, d) => sum + d.totalRevenue, 0);
    const monthlyTotalAfter = monthlyAfter?.totalRevenue || 0;

    console.log(`📊 After: Monthly=${monthlyTotalAfter}, Daily=${dailyTotalAfter}, Diff=${monthlyTotalAfter - dailyTotalAfter}`);

    // Step 7: Verify consistency
    const isConsistent = Math.abs(monthlyTotalAfter - dailyTotalAfter) < 0.01;

    if (!isConsistent) {
      errors.push(`Monthly and daily totals still don't match after reconciliation: Monthly=${monthlyTotalAfter}, Daily=${dailyTotalAfter}`);
    }

    return {
      success: isConsistent,
      month: currentMonth,
      transactionsProcessed: transactions.length,
      dailySummariesCreated,
      monthlySummaryUpdated: true,
      before: {
        monthlyTotal: monthlyTotalBefore,
        dailyTotal: dailyTotalBefore,
        difference: monthlyTotalBefore - dailyTotalBefore,
      },
      after: {
        monthlyTotal: monthlyTotalAfter,
        dailyTotal: dailyTotalAfter,
        difference: monthlyTotalAfter - dailyTotalAfter,
      },
      errors,
    };

  } catch (error) {
    console.error("❌ Reconciliation failed:", error);
    errors.push(`Reconciliation error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      month: currentMonth,
      transactionsProcessed: 0,
      dailySummariesCreated: 0,
      monthlySummaryUpdated: false,
      before: { monthlyTotal: 0, dailyTotal: 0, difference: 0 },
      after: { monthlyTotal: 0, dailyTotal: 0, difference: 0 },
      errors,
    };
  }
}