/**
 * Shared utility functions for date range calculations across reports
 */

export type TimeRange = "MTD" | "30D" | "YTD" | "12M" | "5Y" | "7D" | "3M" | "6M" | "1Y";

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  label: string;
  useDailySummary: boolean; // True if should query daily summaries
  useMonthly Summary: boolean; // True if should query monthly summaries
}

/**
 * Get date range for a given time period
 * @param range - Time range period
 * @param referenceDate - Reference date (defaults to today)
 * @returns Date range with start/end dates and metadata
 */
export function getDateRange(range: TimeRange, referenceDate: Date = new Date()): DateRangeResult {
  const endDate = new Date(referenceDate);
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(referenceDate);
  startDate.setHours(0, 0, 0, 0);

  let label = "";
  let useDailySummary = false;
  let useMonthlySummary = false;

  switch (range) {
    case "MTD": // Month to Date
      startDate.setDate(1);
      label = "Month to Date";
      useDailySummary = true;
      break;

    case "7D": // Last 7 Days
      startDate.setDate(startDate.getDate() - 6);
      label = "Last 7 Days";
      useDailySummary = true;
      break;

    case "30D": // Last 30 Days
      startDate.setDate(startDate.getDate() - 29);
      label = "Last 30 Days";
      useDailySummary = true;
      break;

    case "YTD": // Year to Date
      startDate.setMonth(0, 1);
      label = "Year to Date";
      useMonthlySummary = true;
      useDailySummary = true; // Current month from daily
      break;

    case "3M": // Last 3 Months
      startDate.setMonth(startDate.getMonth() - 2, 1);
      label = "Last 3 Months";
      useMonthlySummary = true;
      useDailySummary = true;
      break;

    case "6M": // Last 6 Months
      startDate.setMonth(startDate.getMonth() - 5, 1);
      label = "Last 6 Months";
      useMonthlySummary = true;
      useDailySummary = true;
      break;

    case "12M": // Last 12 Months
      startDate.setMonth(startDate.getMonth() - 11, 1);
      label = "Last 12 Months";
      useMonthlySummary = true;
      useDailySummary = true;
      break;

    case "1Y": // Last Year (same as 12M)
      startDate.setMonth(startDate.getMonth() - 11, 1);
      label = "Last 12 Months";
      useMonthlySummary = true;
      useDailySummary = true;
      break;

    case "5Y": // Last 5 Years
      startDate.setFullYear(startDate.getFullYear() - 4);
      startDate.setMonth(0, 1);
      label = "Last 5 Years";
      useMonthlySummary = true;
      useDailySummary = true;
      break;

    default:
      // Default to MTD
      startDate.setDate(1);
      label = "Month to Date";
      useDailySummary = true;
  }

  return {
    startDate,
    endDate,
    label,
    useDailySummary,
    useMonthlySummary,
  };
}

/**
 * Format a date as business date string (YYYY-MM-DD)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatBusinessDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date range as display string
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted display string
 */
export function formatDateRangeDisplay(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  const start = startDate.toLocaleDateString("en-US", options);
  const end = endDate.toLocaleDateString("en-US", options);

  return `${start} - ${end}`;
}

/**
 * Get month label for a date
 * @param date - Date to get month for
 * @returns Month label (e.g., "Jan 2026")
 */
export function getMonthLabel(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get year label for a date
 * @param date - Date to get year for
 * @returns Year label (e.g., "2026")
 */
export function getYearLabel(date: Date): string {
  return date.getFullYear().toString();
}

/**
 * Get year-month string (YYYY-MM) for database queries
 * @param date - Date to convert
 * @returns Year-month string
 */
export function getYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Check if a date is in the current month
 * @param date - Date to check
 * @returns True if date is in current month
 */
export function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/**
 * Get list of months between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of year-month strings
 */
export function getMonthsBetween(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate);
  current.setDate(1);

  while (current <= endDate) {
    months.push(getYearMonth(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}