/**
 * Shift Management Service
 * 
 * Handles shift detection and cleanup.
 * Shifts are temporary - deleted immediately after backup initiation.
 * 
 * Data Lifecycle:
 * - Shift created on clock-in/shift open
 * - Transactions linked via shiftId
 * - On shift close: backup initiated (fire-and-forget), shift deleted
 * - Shift data preserved in: Google Sheets (transactions), Calendar (summary)
 */

import { db } from "@/lib/db";
import type { Shift, Settings } from "@/types";

interface ShiftDetectionResult {
  name: string;
  start: string;
  end: string;
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
 * Get the current business date in YYYY-MM-DD format (local time)
 */
export function getBusinessDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Delete shift after backup initiation (fire-and-forget cleanup)
 * Called immediately after backup is initiated, regardless of backup success
 */
export async function deleteShiftAfterBackup(shiftId: string): Promise<void> {
  try {
    await db.delete("shifts", shiftId);
  } catch (error) {
    // Silent failure - shift cleanup is non-critical
    console.warn("Shift cleanup failed (non-blocking):", error);
  }
}

/**
 * Delete all closed shifts (cleanup utility)
 * Can be called periodically to clean up any orphaned shifts
 */
export async function cleanupClosedShifts(): Promise<number> {
  try {
    const allShifts = await db.getAll("shifts") as Shift[];
    const closedShifts = allShifts.filter(s => s.status === "closed");
    
    for (const shift of closedShifts) {
      await db.delete("shifts", shift.shiftId);
    }
    
    return closedShifts.length;
  } catch (error) {
    console.warn("Shift cleanup failed:", error);
    return 0;
  }
}