/**
 * Data Rollup & Cleanup Service
 * Handles monthly rollups, cold data archival, and daily cleanup
 */

import { db } from "@/lib/db";
import type {
  DailyItemSales,
  DailyPaymentSales,
  DailyAttendance,
  MonthlyItemSales,
  MonthlySalesSummary,
  MonthlyAttendanceSummary,
  AttendanceRecord,
  Transaction
} from "@/types";

/**
 * Clean up old transactions (incremental: day 61 only)
 * RETENTION POLICY: 60 days
 */
export async function cleanupOldTransactions(): Promise<number> {
  try {
    const today = new Date();
    const day61 = new Date(today);
    day61.setDate(today.getDate() - 61);
    const day61String = day61.toISOString().split("T")[0];

    console.log(`🧹 Cleaning up transactions from ${day61String}...`);

    const allTransactions = await db.getAll<Transaction>("transactions");
    const transactionsToDelete = allTransactions.filter(t => {
      const txDate = new Date(t.timestamp).toISOString().split("T")[0];
      return txDate === day61String;
    });

    let deletedCount = 0;
    for (const tx of transactionsToDelete) {
      if (tx.id) {
        await db.delete("transactions", tx.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} transactions from day 61 (${day61String})`);
    } else {
      console.log(`🧹 No transactions to clean up from day 61`);
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old transactions:", error);
    throw error;
  }
}

/**
 * Clean up daily records older than specified days (incremental: day N+1 only)
 * RETENTION POLICY: 60 days for daily summaries
 */
export async function cleanupOldDailyRecords(daysToKeep: number = 60): Promise<number> {
  try {
    const today = new Date();
    const dayToDelete = new Date(today);
    dayToDelete.setDate(today.getDate() - (daysToKeep + 1));
    const deleteString = dayToDelete.toISOString().split("T")[0];

    console.log(`🧹 Cleaning up daily records from ${deleteString}...`);

    let dailyItems: DailyItemSales[] = [];
    let dailyPayments: DailyPaymentSales[] = [];
    let dailyAttendance: DailyAttendance[] = [];

    try {
      dailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
    } catch (e) {
      console.log("dailyItemSales table not ready yet");
    }

    try {
      dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
    } catch (e) {
      console.log("dailyPaymentSales table not ready yet");
    }

    try {
      dailyAttendance = await db.getAll<DailyAttendance>("dailyAttendance");
    } catch (e) {
      console.log("dailyAttendance table not ready yet");
    }

    let deletedCount = 0;
    
    for (const record of dailyItems) {
      if (record.businessDate === deleteString && record.id) {
        await db.delete("dailyItemSales", record.id);
        deletedCount++;
      }
    }
    
    for (const record of dailyPayments) {
      if (record.businessDate === deleteString && record.id) {
        await db.delete("dailyPaymentSales", record.id);
        deletedCount++;
      }
    }
    
    for (const record of dailyAttendance) {
      if (record.date === deleteString && record.id) {
        await db.delete("dailyAttendance", record.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} daily records from day ${daysToKeep + 1} (${deleteString})`);
    } else {
      console.log(`🧹 No daily records to clean up from day ${daysToKeep + 1}`);
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old daily records:", error);
    throw error;
  }
}

/**
 * Archive cold data (records older than retention period)
 * DEPRECATED: Use cleanupOldDailyRecords instead
 */
export async function archiveColdData(daysToKeep: number = 60): Promise<number> {
  console.warn("archiveColdData is deprecated, use cleanupOldDailyRecords instead");
  return cleanupOldDailyRecords(daysToKeep);
}

/**
 * Check if monthly rollup is needed and perform it
 */
export async function checkAndRollupMonthly(): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const settings = await db.getSettings();
    const lastMonth = (settings as any).lastMonthlyRollup;

    if (lastMonth && lastMonth !== currentMonth) {
      // Month changed, rollup previous month
      console.log(`📊 Month changed: ${lastMonth} → ${currentMonth}, triggering rollup...`);
      await rollupMonthlyData(lastMonth);
    }

    // Update last rollup date
    const updatedSettings = { ...settings, lastMonthlyRollup: currentMonth } as any;
    await db.updateSettings(updatedSettings);
  } catch (error) {
    console.error("Error checking monthly rollup:", error);
  }
}

/**
 * Rollup daily data into monthly summaries
 */
export async function rollupMonthlyData(month: string): Promise<void> {
  try {
    console.log(`📊 Rolling up data for ${month}...`);

    // Rollup item sales
    const dailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
    const monthlyItemsMap = new Map<number, { 
      quantity: number; 
      revenue: number; 
      count: number; 
      sku: string; 
      name: string 
    }>();

    dailyItems.forEach((item) => {
      if (item.businessDate.startsWith(month)) {
        const existing = monthlyItemsMap.get(item.itemId) || { 
          quantity: 0, 
          revenue: 0, 
          count: 0, 
          sku: item.sku, 
          name: item.itemName 
        };
        existing.quantity += item.totalQuantity;
        existing.revenue += item.totalRevenue;
        existing.count += item.transactionCount;
        monthlyItemsMap.set(item.itemId, existing);
      }
    });

    for (const [itemId, data] of monthlyItemsMap.entries()) {
      const monthlyItem: MonthlyItemSales = {
        itemId,
        sku: data.sku,
        itemName: data.name,
        yearMonth: month,
        totalQuantity: data.quantity,
        totalRevenue: data.revenue,
        transactionCount: data.count
      };
      await db.upsert("monthlyItemSales", ["yearMonth", "itemId"], monthlyItem);
    }

    // Rollup sales summary
    const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
    let totalRevenue = 0;
    let totalReceipts = 0;
    const paymentTotals = { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0 };

    dailyPayments.forEach((payment) => {
      if (payment.businessDate.startsWith(month)) {
        totalRevenue += payment.totalAmount;
        totalReceipts += payment.transactionCount;
        
        if (payment.method === "cash") paymentTotals.cash += payment.totalAmount;
        else if (payment.method === "qris-static") paymentTotals.qrisStatic += payment.totalAmount;
        else if (payment.method === "qris-dynamic") paymentTotals.qrisDynamic += payment.totalAmount;
        else if (payment.method === "voucher") paymentTotals.voucher += payment.totalAmount;
      }
    });

    const monthlySummary: MonthlySalesSummary = {
      yearMonth: month,
      totalRevenue,
      totalReceipts,
      cashAmount: paymentTotals.cash,
      qrisStaticAmount: paymentTotals.qrisStatic,
      qrisDynamicAmount: paymentTotals.qrisDynamic,
      voucherAmount: paymentTotals.voucher
    };
    await db.upsert("monthlySalesSummary", ["yearMonth"], monthlySummary);

    // Rollup attendance
    const attendance = await db.getAll<AttendanceRecord>("attendance");
    const monthlyAttendanceMap = new Map<number, { 
      hours: number; 
      days: number; 
      late: number; 
      name: string 
    }>();

    attendance.forEach((record) => {
      if (record.date.startsWith(month) && record.clockOut) {
        const hours = (record.clockOut - record.clockIn) / (1000 * 60 * 60);
        const existing = monthlyAttendanceMap.get(record.employeeId) || { 
          hours: 0, 
          days: 0, 
          late: 0, 
          name: record.employeeName 
        };
        existing.hours += hours;
        existing.days += 1;
        monthlyAttendanceMap.set(record.employeeId, existing);
      }
    });

    for (const [employeeId, data] of monthlyAttendanceMap.entries()) {
      const monthlyAttendance: MonthlyAttendanceSummary = {
        employeeId,
        employeeName: data.name,
        yearMonth: month,
        totalHours: data.hours,
        daysWorked: data.days,
        lateCount: data.late
      };
      await db.upsert("monthlyAttendanceSummary", ["yearMonth", "employeeId"], monthlyAttendance);
    }

    console.log(`✅ Monthly rollup completed for ${month}`);
  } catch (error) {
    console.error("Error rolling up monthly data:", error);
  }
}

/**
 * Master cleanup function - runs all cleanup tasks
 * Called on app startup
 */
export async function runStartupCleanup(): Promise<void> {
  try {
    console.log("🚀 Running startup cleanup...");
    
    // 1. Clean up old transactions (day 61)
    await cleanupOldTransactions();
    
    // 2. Clean up old daily summaries (day 61)
    await cleanupOldDailyRecords(60);
    
    // 3. Check and trigger monthly rollup if month changed
    await checkAndRollupMonthly();
    
    console.log("✅ Startup cleanup complete");
  } catch (error) {
    console.error("❌ Startup cleanup failed (non-fatal):", error);
  }
}