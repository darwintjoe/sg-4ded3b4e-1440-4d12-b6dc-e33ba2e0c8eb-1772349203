/**
 * One-Time Reconciliation Script for Current Month (2026-01)
 * Rebuilds daily and monthly summaries from actual transactions
 */

import { db } from "./db";
import type { Transaction, MonthlySalesSummary } from "@/types";

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
    const allMonthlySummaries = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
    const monthlyBefore = allMonthlySummaries.find(m => m.yearMonth === currentMonth);
    
    const allDailyPayments = await db.getDailyPaymentSales();
    const dailiesBefore = allDailyPayments.filter(d => d.businessDate.startsWith(currentMonth));
    
    const dailyTotalBefore = dailiesBefore.reduce((sum, d) => sum + d.totalAmount, 0);
    const monthlyTotalBefore = monthlyBefore?.totalRevenue || 0;

    console.log(`📊 Before: Monthly=${monthlyTotalBefore}, Daily=${dailyTotalBefore}, Diff=${monthlyTotalBefore - dailyTotalBefore}`);

    // Step 2: Get all transactions for current month
    const allTransactions = await db.getTransactions();
    const transactions = allTransactions.filter(txn => {
      const txnDate = new Date(txn.timestamp).toISOString().split("T")[0];
      return txnDate.startsWith(currentMonth);
    });

    console.log(`📝 Found ${transactions.length} transactions in ${currentMonth}`);

    // Step 3: Clear existing daily summaries for current month
    const existingDailyItems = await db.getDailyItemSales();
    const existingDailyPayments = await db.getDailyPaymentSales();
    
    // Note: We can't delete individual records, so we'll overwrite them with put()
    
    // Step 4: Rebuild daily summaries from transactions
    const dailyItemsMap = new Map<string, Map<number, { quantity: number; revenue: number; count: number }>>();
    const dailyPaymentsMap = new Map<string, Map<string, { amount: number; count: number }>>();
    
    for (const txn of transactions) {
      const date = new Date(txn.timestamp).toISOString().split("T")[0];
      
      // Track items
      if (!dailyItemsMap.has(date)) {
        dailyItemsMap.set(date, new Map());
      }
      const dayItems = dailyItemsMap.get(date)!;
      
      for (const item of txn.items) {
        const existing = dayItems.get(item.itemId) || { quantity: 0, revenue: 0, count: 0 };
        dayItems.set(item.itemId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.totalPrice,
          count: existing.count + 1
        });
      }
      
      // Track payments
      if (!dailyPaymentsMap.has(date)) {
        dailyPaymentsMap.set(date, new Map());
      }
      const dayPayments = dailyPaymentsMap.get(date)!;
      
      for (const payment of txn.payments) {
        const existing = dayPayments.get(payment.method) || { amount: 0, count: 0 };
        dayPayments.set(payment.method, {
          amount: existing.amount + payment.amount,
          count: existing.count + 1
        });
      }
    }
    
    // Step 5: Save rebuilt daily summaries
    let dailySummariesCreated = 0;
    
    // Save daily item sales
    for (const [date, itemsMap] of dailyItemsMap) {
      for (const [itemId, stats] of itemsMap) {
        // Get item details
        const item = await db.getItemById(itemId);
        if (!item) continue;
        
        await db.upsertDailyItemSales({
          itemId,
          sku: item.sku || "",
          itemName: item.name,
          businessDate: date,
          totalQuantity: stats.quantity,
          totalRevenue: stats.revenue,
          transactionCount: stats.count
        });
        dailySummariesCreated++;
      }
    }
    
    // Save daily payment sales
    for (const [date, paymentsMap] of dailyPaymentsMap) {
      for (const [method, stats] of paymentsMap) {
        await db.upsertDailyPaymentSales({
          method: method as any,
          businessDate: date,
          totalAmount: stats.amount,
          transactionCount: stats.count
        });
        dailySummariesCreated++;
      }
    }

    console.log(`✅ Created/updated ${dailySummariesCreated} daily summary records`);

    // Step 6: Rebuild monthly summary from corrected daily summaries
    const dailiesAfter = allDailyPayments.filter(d => d.businessDate.startsWith(currentMonth));
    
    // Recalculate from fresh daily data
    const freshDailyPayments = await db.getDailyPaymentSales();
    const currentMonthDailies = freshDailyPayments.filter(d => d.businessDate.startsWith(currentMonth));
    
    const totalRevenue = currentMonthDailies.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalReceipts = transactions.length;
    
    // Calculate payment method breakdown
    const paymentBreakdown = currentMonthDailies.reduce((acc, d) => {
      if (d.method === "cash") acc.cashAmount += d.totalAmount;
      else if (d.method === "qris-static") acc.qrisStaticAmount += d.totalAmount;
      else if (d.method === "qris-dynamic") acc.qrisDynamicAmount += d.totalAmount;
      else if (d.method === "voucher") acc.voucherAmount += d.totalAmount;
      return acc;
    }, { cashAmount: 0, qrisStaticAmount: 0, qrisDynamicAmount: 0, voucherAmount: 0 });

    const monthlySummary: MonthlySalesSummary = {
      yearMonth: currentMonth,
      totalRevenue,
      totalReceipts,
      ...paymentBreakdown
    };

    // Update or create monthly summary
    if (monthlyBefore?.id) {
      await db.put("monthlySalesSummary", { ...monthlySummary, id: monthlyBefore.id });
    } else {
      await db.add("monthlySalesSummary", monthlySummary);
    }

    console.log(`✅ Updated monthly summary for ${currentMonth}`);

    // Step 7: Get final state (after reconciliation)
    const allMonthlySummariesAfter = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
    const monthlyAfter = allMonthlySummariesAfter.find(m => m.yearMonth === currentMonth);
    
    const freshDailyPaymentsAfter = await db.getDailyPaymentSales();
    const dailiesAfterFinal = freshDailyPaymentsAfter.filter(d => d.businessDate.startsWith(currentMonth));
    
    const dailyTotalAfter = dailiesAfterFinal.reduce((sum, d) => sum + d.totalAmount, 0);
    const monthlyTotalAfter = monthlyAfter?.totalRevenue || 0;

    console.log(`📊 After: Monthly=${monthlyTotalAfter}, Daily=${dailyTotalAfter}, Diff=${monthlyTotalAfter - dailyTotalAfter}`);

    // Step 8: Verify consistency
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