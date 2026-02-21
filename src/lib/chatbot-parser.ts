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

// Levenshtein distance for typo tolerance
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Fuzzy match with typo tolerance (max 2 character difference)
function fuzzyMatch(input: string, target: string): boolean {
  if (input === target) return true;
  if (input.includes(target) || target.includes(input)) return true;
  
  const distance = levenshteinDistance(input, target);
  const maxDistance = Math.max(2, Math.floor(target.length * 0.3)); // 30% tolerance
  return distance <= maxDistance;
}

// Check if input contains keyword (with typo tolerance)
function containsKeyword(input: string, keywords: string[]): boolean {
  const words = input.split(/\s+/);
  
  for (const word of words) {
    for (const keyword of keywords) {
      if (fuzzyMatch(word, keyword)) {
        return true;
      }
    }
  }
  
  return false;
}

const STOPWORDS = new Set([
  "how many", "sold", "sales", "revenue", "income", "profit", 
  "compare", "vs", "versus", "trend", "performance", "analysis",
  "today", "yesterday", "week", "month", "year",
  "top", "best", "worst", "show", "me", "what", "is", "are", "the",
  "item", "product", "of", "and", "before", "after", "previous", "last"
]);

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
    originalInput: input,
    timeRange,
    compareTimeRange,
    comparison: extractComparisonType(normalizedInput),
    entity,
    limit,
    filters
  };
}

function extractIntent(input: string): QueryIntent {
  // 1. Latest/Last Transaction queries (highest priority)
  if (containsKeyword(input, ["latest", "last", "recent", "final"])) {
    if (containsKeyword(input, ["transaction", "sale", "receipt", "purchase"])) {
      return "transaction_history";
    }
  }

  // 2. Detail/Details drill-down
  if (containsKeyword(input, ["detail", "details", "breakdown", "specific"])) {
    if (containsKeyword(input, ["transaction", "receipt", "sale"])) return "transaction_detail";
    if (containsKeyword(input, ["item", "product"])) return "item_performance";
    if (containsKeyword(input, ["employee", "staff"])) return "employee_performance";
    // Default to asking for clarification
  }

  // 3. Transaction Detail (Receipt #XXX)
  if (/receipt\s*#?\d+|transaction\s*#?\d+/i.test(input)) {
    return "transaction_detail";
  }

  // 4. Transaction History
  if (containsKeyword(input, ["transaction", "receipt", "sale"])) {
    if (containsKeyword(input, ["history", "list", "show", "all"])) {
      return "transaction_history";
    }
  }

  // 5. Comparison
  if (containsKeyword(input, ["compare", "versus", "difference", "between"])) {
    return "comparison";
  }

  // 6. Item Analysis
  if (containsKeyword(input, ["item", "product", "selling", "stock", "inventory"])) {
    // Slowest/worst items
    if (containsKeyword(input, ["slowest", "worst", "bottom", "least", "lowest"])) {
      return "bottom_items";
    }
    // Top/best items
    if (containsKeyword(input, ["top", "best", "most", "popular", "highest"])) {
      return "top_items";
    }
    // Specific item performance
    if (containsKeyword(input, ["how many", "sold", "performance"])) {
      return "item_performance";
    }
    // Category analysis
    if (containsKeyword(input, ["category", "group", "type"])) {
      return "category_analysis";
    }
    return "top_items"; // Default to top items
  }

  // 7. Employee/Staff Analysis
  if (containsKeyword(input, ["employee", "staff", "cashier", "worker", "seller"])) {
    return "employee_performance";
  }

  // 8. Attendance
  if (containsKeyword(input, ["attendance", "shift", "work", "present", "absent", "schedule"])) {
    return "attendance";
  }

  // 9. Payment Method
  if (containsKeyword(input, ["payment", "method", "cash", "card", "digital", "wallet"])) {
    return "payment_method";
  }

  // 10. Specific Analysis Types
  if (containsKeyword(input, ["trend", "growth", "pattern", "change"])) {
    return "trends";
  }
  if (containsKeyword(input, ["peak", "hour", "time", "busiest", "busy"])) {
    return "peak_hours";
  }

  // 11. Revenue/Sales (lower priority to avoid catching everything)
  if (containsKeyword(input, ["revenue", "sales", "income", "money", "profit", "earning"])) {
    return "revenue";
  }

  // 12. Transaction count
  if (containsKeyword(input, ["transaction", "sale", "order", "purchase"])) {
    return "transactions";
  }

  // 13. Polite/Help
  if (containsKeyword(input, ["help"]) && input.split(/\s+/).length === 1) {
    return "help";
  }
  if (containsKeyword(input, ["hello", "greetings"])) {
    return "polite_response";
  }
  if (containsKeyword(input, ["thank", "thanks"])) {
    return "polite_response";
  }

  return "help"; // Default fallback
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