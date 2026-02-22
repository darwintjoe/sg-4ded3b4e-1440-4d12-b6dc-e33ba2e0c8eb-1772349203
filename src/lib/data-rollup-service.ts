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
  AttendanceRecord
} from "@/types";

/**
 * Clean up daily records older than specified days
 */
export async function cleanupOldDailyRecords(daysToKeep: number = 30): Promise<number> {
  try {
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString().split("T")[0];

    console.log(`🧹 Cleaning up daily records older than ${cutoffString}...`);

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
      if (record.businessDate < cutoffString && record.id) {
        await db.delete("dailyItemSales", record.id);
        deletedCount++;
      }
    }
    
    for (const record of dailyPayments) {
      if (record.businessDate < cutoffString && record.id) {
        await db.delete("dailyPaymentSales", record.id);
        deletedCount++;
      }
    }
    
    for (const record of dailyAttendance) {
      if (record.date < cutoffString && record.id) {
        await db.delete("dailyAttendance", record.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Deleted ${deletedCount} old daily records`);
    } else {
      console.log("🧹 No old records to clean up");
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old daily records:", error);
    throw error;
  }
}

/**
 * Archive cold data (records older than retention period)
 */
export async function archiveColdData(daysToKeep: number = 30): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString().split("T")[0];

    const dailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
    const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");

    let deletedCount = 0;

    for (const item of dailyItems) {
      if (item.businessDate < cutoffString && item.id) {
        await db.delete("dailyItemSales", item.id);
        deletedCount++;
      }
    }

    for (const payment of dailyPayments) {
      if (payment.businessDate < cutoffString && payment.id) {
        await db.delete("dailyPaymentSales", payment.id);
        deletedCount++;
      }
    }

    console.log(`✅ Archived cold data: Deleted ${deletedCount} records older than ${cutoffString}`);
    return deletedCount;
  } catch (error) {
    console.error("Error archiving cold data:", error);
    return 0;
  }
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

    console.log(`Monthly rollup completed for ${month}`);
  } catch (error) {
    console.error("Error rolling up monthly data:", error);
  }
}