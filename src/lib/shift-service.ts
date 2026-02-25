/**
 * Shift Management Service
 * Handles shift detection, closing, and summary generation
 */

import { db } from "@/lib/db";
import type { 
  Shift, 
  Transaction, 
  DailyShiftSummary, 
  Settings
} from "@/types";

interface ShiftDetectionResult {
  name: string;
  start: string;
  end: string;
}

interface PaymentBreakdown {
  cash: number;
  qrisStatic: number;
  qrisDynamic: number;
  voucher: number;
}

/**
 * Convert "HH:MM" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate circular distance between two times (handles midnight wrap-around)
 * Returns the shortest distance considering the 24-hour cycle
 */
function circularTimeDistance(timeA: number, timeB: number): number {
  const MINUTES_IN_DAY = 24 * 60; // 1440 minutes
  const directDistance = Math.abs(timeA - timeB);
  const wrapDistance = MINUTES_IN_DAY - directDistance;
  return Math.min(directDistance, wrapDistance);
}

/**
 * Detect which shift a clock-in time belongs to based on proximity
 * Uses circular distance to handle midnight wrap-around correctly
 * 
 * Examples:
 * - Clock in 07:45, Shift1 08:00, Shift2 15:00 → Shift1 (15 min closer)
 * - Clock in 09:30, Shift1 08:00, Shift2 15:00 → Shift1 (90 min vs 330 min)
 * - Clock in 12:00, Shift1 08:00, Shift2 15:00 → Shift2 (180 min vs 240 min)
 * - Clock in 23:00, Shift1 14:00, Shift2 00:00 → Shift2 (60 min vs 540 min)
 */
export function detectShift(
  clockInTime: number, 
  settings: Settings | null
): ShiftDetectionResult | null {
  if (!settings) return null;

  const enabledShifts = Object.values(settings.shifts).filter(s => s.enabled);
  
  if (enabledShifts.length === 0) return null;
  if (enabledShifts.length === 1) {
    return {
      name: enabledShifts[0].name,
      start: enabledShifts[0].startTime,
      end: enabledShifts[0].endTime
    };
  }

  // Convert timestamp to minutes since midnight
  const clockInDate = new Date(clockInTime);
  const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();

  // Find closest shift by start time using circular distance
  let closestShift = enabledShifts[0];
  let smallestDistance = Infinity;

  for (const shift of enabledShifts) {
    const shiftStartMinutes = timeToMinutes(shift.startTime);
    const distance = circularTimeDistance(clockInMinutes, shiftStartMinutes);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestShift = shift;
    }
  }

  return {
    name: closestShift.name,
    start: closestShift.startTime,
    end: closestShift.endTime
  };
}

/**
 * Generate a unique shift ID for the business date
 */
export async function generateShiftId(businessDate: string): Promise<string> {
  const existingShifts = await db.searchByIndex<Shift>("shifts", "businessDate", businessDate);
  const shiftNumber = existingShifts.length + 1;
  return `${businessDate}-shift-${shiftNumber}`;
}

/**
 * Get the current business date in YYYY-MM-DD format
 */
export function getBusinessDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Generate daily shift summary after shift closes
 */
export async function generateDailyShiftSummary(shift: Shift): Promise<void> {
  try {
    const shiftTransactions = await db.searchByIndex<Transaction>(
      "transactions", 
      "shiftId", 
      shift.shiftId
    );

    const paymentBreakdown: PaymentBreakdown = {
      cash: 0,
      qrisStatic: 0,
      qrisDynamic: 0,
      voucher: 0
    };

    let totalRevenue = 0;

    shiftTransactions.forEach((t) => {
      totalRevenue += t.total;
      t.payments.forEach((p) => {
        if (p.method === "cash") paymentBreakdown.cash += p.amount;
        else if (p.method === "qris-static") paymentBreakdown.qrisStatic += p.amount;
        else if (p.method === "qris-dynamic") paymentBreakdown.qrisDynamic += p.amount;
        else if (p.method === "voucher") paymentBreakdown.voucher += p.amount;
      });
    });

    const hoursWorked = shift.shiftEnd 
      ? (shift.shiftEnd - shift.shiftStart) / (1000 * 60 * 60) 
      : 0;

    const summary: DailyShiftSummary = {
      shiftId: shift.shiftId,
      businessDate: shift.businessDate,
      cashierId: shift.cashierId,
      cashierName: shift.cashierName,
      totalRevenue,
      totalReceipts: shiftTransactions.length,
      paymentBreakdown,
      hoursWorked
    };

    await db.add("dailyShiftSummary", summary);
  } catch (error) {
    console.error("Error generating daily shift summary:", error);
  }
}

/**
 * Get shift report data for calendar/export
 */
export async function getShiftReportData(shift: Shift): Promise<{
  totalRevenue: number;
  transactionCount: number;
  paymentBreakdown: {
    cash: number;
    qrisStatic: number;
    qrisDynamic: number;
    voucher: number;
    cashCount: number;
    qrisStaticCount: number;
    qrisDynamicCount: number;
    voucherCount: number;
  };
  hoursWorked: number;
}> {
  const shiftTransactions = await db.searchByIndex<Transaction>(
    "transactions", 
    "shiftId", 
    shift.shiftId
  );

  const paymentBreakdown = {
    cash: 0,
    qrisStatic: 0,
    qrisDynamic: 0,
    voucher: 0,
    cashCount: 0,
    qrisStaticCount: 0,
    qrisDynamicCount: 0,
    voucherCount: 0
  };

  let totalRevenue = 0;

  shiftTransactions.forEach((t) => {
    totalRevenue += t.total;
    t.payments.forEach((p) => {
      if (p.method === "cash") {
        paymentBreakdown.cash += p.amount;
        paymentBreakdown.cashCount++;
      } else if (p.method === "qris-static") {
        paymentBreakdown.qrisStatic += p.amount;
        paymentBreakdown.qrisStaticCount++;
      } else if (p.method === "qris-dynamic") {
        paymentBreakdown.qrisDynamic += p.amount;
        paymentBreakdown.qrisDynamicCount++;
      } else if (p.method === "voucher") {
        paymentBreakdown.voucher += p.amount;
        paymentBreakdown.voucherCount++;
      }
    });
  });

  const hoursWorked = shift.shiftEnd 
    ? (shift.shiftEnd - shift.shiftStart) / (1000 * 60 * 60) 
    : 0;

  return {
    totalRevenue,
    transactionCount: shiftTransactions.length,
    paymentBreakdown,
    hoursWorked
  };
}