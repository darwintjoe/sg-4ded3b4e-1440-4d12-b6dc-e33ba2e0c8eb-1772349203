/**
 * Data Rollup & Cleanup Service
 * 
 * RETENTION POLICIES:
 * - transactions: 60 days (daily cleanup of day 61)
 * - attendance: 3 months (cleanup after rollup, keep for employee detail cards)
 * - dailyItemSales: Until rollup (cleanup after successful monthly rollup)
 * - dailyPaymentSales: Until rollup (cleanup after successful monthly rollup)
 * - monthly summaries: Forever (historical reporting)
 */

import { db } from "@/lib/db";
import type {
  DailyItemSales,
  DailyPaymentSales,
  MonthlyItemSales,
  MonthlySalesSummary,
  MonthlyAttendanceSummary,
  AttendanceRecord,
  Transaction
} from "@/types";

/**
 * Get previous month in YYYY-MM format
 */
function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1); // month is 0-indexed, so month-2
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}

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
 * Clean up attendance records older than 3 months
 * RETENTION POLICY: 3 months (for employee detail cards)
 * Called after successful monthly rollup
 */
export async function cleanupOldAttendance(): Promise<number> {
  try {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    const cutoffDate = threeMonthsAgo.toISOString().split("T")[0];

    console.log(`🧹 Cleaning up attendance records older than ${cutoffDate}...`);

    const allAttendance = await db.getAll<AttendanceRecord>("attendance");
    const recordsToDelete = allAttendance.filter(record => record.date < cutoffDate);

    let deletedCount = 0;
    for (const record of recordsToDelete) {
      if (record.id) {
        await db.delete("attendance", record.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} attendance records older than 3 months`);
    } else {
      console.log(`🧹 No attendance records to clean up`);
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old attendance:", error);
    throw error;
  }
}

/**
 * Clean up daily summaries for a specific month after successful rollup
 * Only cleans up data that has been rolled up to monthly summaries
 */
export async function cleanupDailySummariesForMonth(yearMonth: string): Promise<number> {
  try {
    console.log(`🧹 Cleaning up daily summaries for ${yearMonth}...`);

    let deletedCount = 0;

    // Clean up dailyItemSales
    try {
      const dailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
      for (const record of dailyItems) {
        if (record.businessDate.startsWith(yearMonth) && record.id) {
          await db.delete("dailyItemSales", record.id);
          deletedCount++;
        }
      }
    } catch (e) {
      console.log("dailyItemSales table not ready yet");
    }

    // Clean up dailyPaymentSales
    try {
      const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
      for (const record of dailyPayments) {
        if (record.businessDate.startsWith(yearMonth) && record.id) {
          await db.delete("dailyPaymentSales", record.id);
          deletedCount++;
        }
      }
    } catch (e) {
      console.log("dailyPaymentSales table not ready yet");
    }

    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} daily summary records for ${yearMonth}`);
    } else {
      console.log(`🧹 No daily summaries to clean up for ${yearMonth}`);
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up daily summaries:", error);
    throw error;
  }
}

/**
 * Check if monthly rollup is needed and perform it
 * Rollup happens when month changes (first access of new month)
 */
export async function checkAndRollupMonthly(): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const settings = await db.getSettings();
    const lastRollupMonth = (settings as any).lastMonthlyRollup;
    const lastCleanupMonth = (settings as any).lastCleanupMonth;

    // If no previous rollup, just set current month and return
    if (!lastRollupMonth) {
      const updatedSettings = { 
        ...settings, 
        lastMonthlyRollup: currentMonth,
        lastCleanupMonth: currentMonth 
      } as any;
      await db.updateSettings(updatedSettings);
      console.log(`📊 First run: Setting rollup month to ${currentMonth}`);
      return false;
    }

    // Check if month changed (needs rollup)
    if (lastRollupMonth !== currentMonth) {
      console.log(`📊 Month changed: ${lastRollupMonth} → ${currentMonth}, triggering rollup...`);
      
      // 1. Rollup the previous month's data
      await rollupMonthlyData(lastRollupMonth);
      
      // 2. Clean up daily summaries for the rolled-up month (AFTER successful rollup)
      await cleanupDailySummariesForMonth(lastRollupMonth);
      
      // 3. Clean up attendance older than 3 months
      await cleanupOldAttendance();
      
      // 4. Update settings with both timestamps
      const updatedSettings = { 
        ...settings, 
        lastMonthlyRollup: currentMonth,
        lastCleanupMonth: currentMonth
      } as any;
      await db.updateSettings(updatedSettings);
      
      return true;
    }

    // Same month - check if cleanup was missed (safety net)
    if (lastCleanupMonth && lastCleanupMonth !== currentMonth) {
      console.log(`📊 Cleanup was missed for ${lastCleanupMonth}, running now...`);
      await cleanupDailySummariesForMonth(lastCleanupMonth);
      
      const updatedSettings = { ...settings, lastCleanupMonth: currentMonth } as any;
      await db.updateSettings(updatedSettings);
    }

    return false;
  } catch (error) {
    console.error("Error checking monthly rollup:", error);
    return false;
  }
}

/**
 * Rollup daily data into monthly summaries
 */
export async function rollupMonthlyData(month: string): Promise<void> {
  try {
    console.log(`📊 Rolling up data for ${month}...`);

    // ========================================
    // 1. Rollup Item Sales (dailyItemSales → monthlyItemSales)
    // ========================================
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
    console.log(`  ✅ Rolled up ${monthlyItemsMap.size} items to monthlyItemSales`);

    // ========================================
    // 2. Rollup Payment Sales (dailyPaymentSales → monthlySalesSummary)
    // ========================================
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
    console.log(`  ✅ Rolled up sales summary: ${totalReceipts} receipts, Rp ${totalRevenue.toLocaleString()}`);

    // ========================================
    // 3. Rollup Attendance (attendance → monthlyAttendanceSummary)
    // ========================================
    const attendance = await db.getAll<AttendanceRecord>("attendance");
    const monthlyAttendanceMap = new Map<number, { 
      hours: number; 
      days: number; 
      lateCount: number;
      totalLateMinutes: number;
      earlyLeaveCount: number;
      totalEarlyLeaveMinutes: number;
      name: string 
    }>();

    attendance.forEach((record) => {
      if (record.date.startsWith(month) && record.clockOut) {
        const hours = (record.clockOut - record.clockIn) / (1000 * 60 * 60);
        const existing = monthlyAttendanceMap.get(record.employeeId) || { 
          hours: 0, 
          days: 0, 
          lateCount: 0,
          totalLateMinutes: 0,
          earlyLeaveCount: 0,
          totalEarlyLeaveMinutes: 0,
          name: record.employeeName 
        };
        existing.hours += hours;
        existing.days += 1;
        if (record.isLate) {
          existing.lateCount += 1;
          existing.totalLateMinutes += record.lateMinutes || 0;
        }
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
        lateCount: data.lateCount,
        totalLateMinutes: data.totalLateMinutes,
        earlyLeaveCount: data.earlyLeaveCount,
        totalEarlyLeaveMinutes: data.totalEarlyLeaveMinutes
      };
      await db.upsert("monthlyAttendanceSummary", ["yearMonth", "employeeId"], monthlyAttendance);
    }
    console.log(`  ✅ Rolled up ${monthlyAttendanceMap.size} employees to monthlyAttendanceSummary`);

    console.log(`✅ Monthly rollup completed for ${month}`);
  } catch (error) {
    console.error("Error rolling up monthly data:", error);
    throw error; // Re-throw to prevent cleanup of unrolled data
  }
}

/**
 * Master cleanup function - runs all cleanup tasks
 * Called on app startup
 * 
 * ORDER IS CRITICAL:
 * 1. Monthly rollup (if month changed)
 * 2. Clean up daily summaries (AFTER rollup)
 * 3. Clean up old attendance (AFTER rollup) 
 * 4. Clean up old transactions (60-day rule)
 */
export async function runStartupCleanup(): Promise<void> {
  try {
    console.log("🚀 Running startup cleanup...");
    
    // 1. Check and trigger monthly rollup if month changed
    // This also handles cleanup of rolled-up daily summaries and old attendance
    const didRollup = await checkAndRollupMonthly();
    
    if (didRollup) {
      console.log("📊 Monthly rollup and cleanup completed");
    }
    
    // 2. Clean up old transactions (day 61) - always runs
    await cleanupOldTransactions();
    
    console.log("✅ Startup cleanup complete");
  } catch (error) {
    console.error("❌ Startup cleanup failed (non-fatal):", error);
  }
}

/**
 * Manual rollup trigger for testing/admin purposes
 */
export async function forceRollupMonth(yearMonth: string): Promise<void> {
  console.log(`🔧 Force rollup triggered for ${yearMonth}`);
  await rollupMonthlyData(yearMonth);
  await cleanupDailySummariesForMonth(yearMonth);
  console.log(`✅ Force rollup complete for ${yearMonth}`);
}