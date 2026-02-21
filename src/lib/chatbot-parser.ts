import { 
  ParsedQuery, 
  QueryIntent, 
  TimeRange, 
  ComparisonType
} from "@/types";
import { 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear,
  subYears,
  isValid,
  parse,
  addYears,
  startOfDay,
  endOfDay,
  subWeeks,
  differenceInDays
} from "date-fns";

export function parseQuery(input: string): ParsedQuery {
  const normalizedInput = input.toLowerCase().trim();
  
  // Extract components
  const intent = extractIntent(normalizedInput);
  const timeRange = extractTimeRange(normalizedInput);
  const compareTimeRange = extractCompareTimeRange(normalizedInput, timeRange);
  const entity = extractEntity(normalizedInput);
  const limit = extractLimit(normalizedInput);
  const filters = extractFilters(normalizedInput);

  return {
    intent,
    timeRange,
    compareTimeRange,
    comparison: extractComparisonType(normalizedInput),
    entity,
    limit,
    filters
  };
}

function extractIntent(input: string): QueryIntent {
  // 1. Transaction Detail (Receipt #)
  if (input.includes("receipt") || input.includes("transaction") || input.match(/#\d+/)) {
    if (input.match(/#\d+/) || input.includes("detail")) return "transaction_detail";
    if (input.includes("history") || input.includes("last")) return "transaction_history";
  }

  // 2. Comparison
  if (input.includes("compare") || input.includes("vs") || input.includes("versus") || input.includes("difference")) {
    return "compare";
  }

  // 3. Help / Greeting
  if (input.match(/^(help|hi|hello|hey|greetings)/)) {
    if (input.match(/^(hi|hello|hey|greetings)/)) return "polite_response";
    return "help";
  }

  // 4. Specific Analysis
  if (input.includes("revenue") || input.includes("sales") || input.includes("income") || input.includes("money")) {
    if (input.includes("employee") || input.includes("staff") || input.includes("cashier")) return "employee_sales";
    if (input.includes("trend")) return "trends";
    if (input.includes("peak") || input.includes("hour") || input.includes("time")) return "peak_hours";
    return "revenue";
  }

  if (input.includes("item") || input.includes("product") || input.includes("selling") || input.includes("sold")) {
    if (input.includes("top") || input.includes("best")) return "top_items";
    if (input.includes("how many")) return "item_performance"; // "How many coffees sold?"
    return "top_items"; // Default to top items if vague
  }

  if (input.includes("category") || input.includes("group")) {
    return "category_analysis";
  }

  if (input.includes("payment") || input.includes("method") || input.includes("cash") || input.includes("card")) {
    return "payment_methods";
  }

  if (input.includes("employee") || input.includes("staff") || input.includes("cashier") || input.includes("who sold")) {
    return "employee_sales";
  }

  if (input.includes("attendance") || input.includes("shift") || input.includes("work") || input.includes("present")) {
    return "attendance";
  }

  // Fallback for generic "how many"
  if (input.includes("how many") && input.includes("transaction")) {
    return "transactions";
  }

  return "unknown";
}

function extractTimeRange(input: string): TimeRange {
  const now = new Date();

  // Special case: "last transaction" without time context = all time
  const isLastQuery = /\b(last|latest|most recent|final)\s+(transaction|sale|receipt)\b/i.test(input);
  const hasTimeWindow = /\b(today|yesterday|week|month|day)\b/i.test(input);
  
  if (isLastQuery && !hasTimeWindow) {
    return { type: "all_time" };
  }

  // 1. Specific Months
  const monthMatch = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (monthMatch) {
    const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    const year = new Date().getFullYear();
    return {
      type: "custom",
      startDate: new Date(year, monthIndex, 1),
      endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59)
    };
  }

  // 2. "Last X months/weeks/days"
  const lastPeriodMatch = input.match(/\blast\s+(\d+)\s+(month|week|day)s?\b/i);
  if (lastPeriodMatch) {
    const count = parseInt(lastPeriodMatch[1]);
    const unit = lastPeriodMatch[2].toLowerCase();
    const endDate = endOfDay(now);
    let startDate: Date;

    if (unit === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - count, now.getDate());
    } else if (unit === "week") {
      startDate = new Date(now.getTime() - count * 7 * 24 * 60 * 60 * 1000);
    } else { // day
      startDate = new Date(now.getTime() - count * 24 * 60 * 60 * 1000);
    }
    startDate = startOfDay(startDate);

    return { type: "custom", startDate, endDate };
  }

  // 3. This/Last Week
  if (/\bthis\s+week\b/i.test(input)) {
    const startDate = startOfWeek(now);
    const endDate = endOfDay(now);
    return { type: "this_week", startDate, endDate };
  }
  if (/\blast\s+week\b/i.test(input)) {
    const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = startOfWeek(lastWeekStart);
    const endDate = endOfWeek(lastWeekStart);
    return { type: "last_week", startDate, endDate };
  }

  // 4. This/Last Month
  if (/\bthis\s+month\b/i.test(input)) {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endOfDay(now);
    return { type: "this_month", startDate, endDate };
  }
  if (/\blast\s+month\b/i.test(input)) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startDate = lastMonth;
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { type: "last_month", startDate, endDate };
  }

  // 5. This/Last Year
  if (/\bthis\s+year\b/i.test(input)) {
    const startDate = startOfYear(now);
    const endDate = endOfDay(now);
    return { type: "custom", startDate, endDate };
  }
  if (/\blast\s+year\b/i.test(input)) {
    const lastYear = subYears(now, 1);
    const startDate = startOfYear(lastYear);
    const endDate = endOfYear(lastYear);
    return { type: "custom", startDate, endDate };
  }

  // 6. Yesterday
  if (/\byesterday\b/i.test(input)) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { type: "yesterday", startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
  }

  // 7. Default: Today
  return { type: "today", startDate: startOfDay(now), endDate: endOfDay(now) };
}

function extractCompareTimeRange(input: string, primaryRange: TimeRange): TimeRange | undefined {
  const compareKeywords = ["vs", "compare", "against", "with", "and"];
  const hasComparison = compareKeywords.some(k => input.includes(k));
  
  if (!hasComparison) return undefined;

  // Split input by comparison keyword
  const parts = input.split(new RegExp(compareKeywords.join("|")));
  if (parts.length < 2) return undefined;
  
  const comparePart = parts[1].trim(); // The part AFTER the comparison keyword
  
  // 1. Explicit Relative Logic ("month before", "previous month")
  if (comparePart.includes("month before") || comparePart.includes("previous month") || comparePart.includes("last month")) {
    if (primaryRange.startDate) {
      const start = startOfMonth(subMonths(primaryRange.startDate, 1));
      const end = endOfMonth(start);
      return { type: "custom", startDate: start, endDate: end };
    }
    // Fallback if primary range is not date-based (unlikely given extractTimeRange defaults)
    const now = new Date();
    const start = startOfMonth(subMonths(now, 1));
    const end = endOfMonth(start);
    return { type: "last_month", startDate: start, endDate: end };
  }

  if (comparePart.includes("year before") || comparePart.includes("previous year") || comparePart.includes("last year")) {
    if (primaryRange.startDate) {
      const start = subYears(primaryRange.startDate, 1);
      const end = subYears(primaryRange.endDate || primaryRange.startDate, 1);
      return { type: "custom", startDate: start, endDate: end };
    }
  }

  // 2. Standard Parsing for the second part
  const detected = extractTimeRange(comparePart);
  
  // If extractTimeRange returned "today" but the text didn't explicitly say "today",
  // it means it fell back to default. In that case, we return undefined to let interpreter decide default.
  if (detected.type === "today" && !comparePart.includes("today")) {
    return undefined; 
  }
  
  return detected;
}

function extractEntity(input: string): string | undefined {
  // Remove common keywords to isolate the entity
  const keywords = [
    "how many", "sold", "sales", "revenue", "income", "profit", 
    "compare", "vs", "versus", "trend", "performance", "analysis",
    "today", "yesterday", "week", "month", "year",
    "top", "best", "worst", "show", "me", "what", "is", "are", "the",
    "item", "product", "of", "and", "before", "after", "previous", "last"
  ];
  
  let cleaned = input;
  keywords.forEach(k => {
    cleaned = cleaned.replace(new RegExp(`\\b${k}\\b`, "g"), "");
  });
  
  cleaned = cleaned.trim().replace(/\s+/g, " ");
  return cleaned.length > 1 ? cleaned : undefined;
}

function extractLimit(input: string): number | undefined {
  const match = input.match(/\b(top|last|show)\s+(\d+)\b/);
  if (match) return parseInt(match[2]);
  return undefined;
}

function extractComparisonType(input: string): ComparisonType | undefined {
  if (input.includes("day")) return "day_over_day";
  if (input.includes("week")) return "week_over_week";
  if (input.includes("month")) return "month_over_month";
  return undefined;
}

function extractFilters(input: string): Record<string, any> | undefined {
  const receiptMatch = input.match(/#(\d+)/);
  if (receiptMatch) {
    return { receiptNumber: parseInt(receiptMatch[1]) };
  }
  return undefined;
}

// Helper for fuzzy matching
function isSimilarWord(word: string, keyword: string): boolean {
  if (Math.abs(word.length - keyword.length) > 2) return false;
  return word.includes(keyword) || keyword.includes(word);
}