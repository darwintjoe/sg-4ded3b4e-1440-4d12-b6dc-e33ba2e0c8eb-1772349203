export interface ParsedQuery {
  intent: QueryIntent;
  timeRange: TimeRange;
  entity?: string;
  metric?: string;
  limit?: number;
  comparison?: ComparisonType;
  filters?: QueryFilters;
}

export type QueryIntent =
  | "help"
  | "revenue"
  | "transactions"
  | "top_items"
  | "item_performance"
  | "category_analysis"
  | "payment_methods"
  | "employee_performance"
  | "attendance"
  | "peak_hours"
  | "trends"
  | "trend_analysis"
  | "transaction_count"
  | "comparison"
  | "unknown";

export type TimeRange = {
  type: "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom" | "last_n_days" | "all_time";
  days?: number;
  startDate?: Date;
  endDate?: Date;
};

export type ComparisonType = "day_over_day" | "week_over_week" | "month_over_month" | "period_comparison";

export interface QueryFilters {
  category?: string;
  employee?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

const HELP_KEYWORDS = ["help", "what can you do", "commands", "examples", "guide"];

const REVENUE_KEYWORDS = ["revenue", "sales", "income", "earnings", "total sales", "how much"];
const TRANSACTION_KEYWORDS = ["transaction", "transactions", "sales count", "how many sales"];
const TOP_ITEMS_KEYWORDS = ["top", "best", "most sold", "popular", "highest"];
const ITEM_KEYWORDS = ["item", "product", "sold"];
const CATEGORY_KEYWORDS = ["category", "categories"];
const PAYMENT_KEYWORDS = ["payment", "cash", "gcash", "card", "paymaya"];
const EMPLOYEE_KEYWORDS = ["employee", "staff", "worker", "seller"];
const ATTENDANCE_KEYWORDS = ["attendance", "present", "absent", "working", "clocked"];
const PEAK_KEYWORDS = ["peak", "busiest", "best time", "most sales time"];
const TREND_KEYWORDS = ["trend", "growth", "increase", "decrease", "pattern"];
const COMPARISON_KEYWORDS = ["compare", "vs", "versus", "difference"];

const TIME_TODAY = ["today", "now"];
const TIME_YESTERDAY = ["yesterday"];
const TIME_THIS_WEEK = ["this week", "week"];
const TIME_LAST_WEEK = ["last week"];
const TIME_THIS_MONTH = ["this month", "month"];
const TIME_LAST_MONTH = ["last month"];
const TIME_LAST_N_DAYS = /last (\d+) days?/i;
const TIME_ALL_TIME = ["all time", "all the time", "ever", "total", "overall", "since beginning", "since start", "entire history"];

export function parseQuery(input: string): ParsedQuery {
  const lowerInput = input.toLowerCase().trim();

  if (matchesKeywords(lowerInput, HELP_KEYWORDS)) {
    return {
      intent: "help",
      timeRange: { type: "today" },
    };
  }

  const timeRange = extractTimeRange(lowerInput);
  const limit = extractLimit(lowerInput);
  const entity = extractEntity(lowerInput);

  if (matchesKeywords(lowerInput, COMPARISON_KEYWORDS)) {
    return {
      intent: "comparison",
      timeRange,
      comparison: extractComparisonType(lowerInput),
      entity,
    };
  }

  if (matchesKeywords(lowerInput, PEAK_KEYWORDS)) {
    return {
      intent: "peak_hours",
      timeRange,
    };
  }

  if (matchesKeywords(lowerInput, ATTENDANCE_KEYWORDS)) {
    return {
      intent: "attendance",
      timeRange,
      entity,
    };
  }

  if (matchesKeywords(lowerInput, EMPLOYEE_KEYWORDS)) {
    return {
      intent: "employee_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (matchesKeywords(lowerInput, PAYMENT_KEYWORDS)) {
    return {
      intent: "payment_methods",
      timeRange,
    };
  }

  if (matchesKeywords(lowerInput, CATEGORY_KEYWORDS)) {
    return {
      intent: "category_analysis",
      timeRange,
    };
  }

  if (matchesKeywords(lowerInput, TOP_ITEMS_KEYWORDS) && matchesKeywords(lowerInput, ITEM_KEYWORDS)) {
    return {
      intent: "top_items",
      timeRange,
      limit,
    };
  }

  if (matchesKeywords(lowerInput, ITEM_KEYWORDS)) {
    return {
      intent: "item_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (matchesKeywords(lowerInput, TRANSACTION_KEYWORDS)) {
    return {
      intent: "transactions",
      timeRange,
    };
  }

  if (matchesKeywords(lowerInput, REVENUE_KEYWORDS)) {
    return {
      intent: "revenue",
      timeRange,
    };
  }

  if (matchesKeywords(lowerInput, TREND_KEYWORDS)) {
    return {
      intent: "trends",
      timeRange,
      entity,
    };
  }

  return {
    intent: "unknown",
    timeRange: { type: "today" },
  };
}

function matchesKeywords(input: string, keywords: string[]): boolean {
  return keywords.some((keyword) => input.includes(keyword));
}

function extractTimeRange(input: string): TimeRange {
  if (matchesKeywords(input, TIME_ALL_TIME)) {
    return { type: "all_time" };
  }
  
  if (matchesKeywords(input, TIME_TODAY)) {
    return { type: "today" };
  }
  if (matchesKeywords(input, TIME_YESTERDAY)) {
    return { type: "yesterday" };
  }
  if (matchesKeywords(input, TIME_THIS_WEEK)) {
    return { type: "this_week" };
  }
  if (matchesKeywords(input, TIME_LAST_WEEK)) {
    return { type: "last_week" };
  }
  if (matchesKeywords(input, TIME_THIS_MONTH)) {
    return { type: "this_month" };
  }
  if (matchesKeywords(input, TIME_LAST_MONTH)) {
    return { type: "last_month" };
  }

  const lastNDaysMatch = input.match(TIME_LAST_N_DAYS);
  if (lastNDaysMatch) {
    return {
      type: "last_n_days",
      days: parseInt(lastNDaysMatch[1]),
    };
  }

  return { type: "today" };
}

function extractLimit(input: string): number | undefined {
  const topMatch = input.match(/top (\d+)/i);
  if (topMatch) {
    return parseInt(topMatch[1]);
  }

  const numberMatch = input.match(/(\d+) items?/i);
  if (numberMatch) {
    return parseInt(numberMatch[1]);
  }

  return undefined;
}

function extractEntity(input: string): string | undefined {
  const quotedMatch = input.match(/"([^"]+)"/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  const namedMatch = input.match(/(?:item|employee|category|product) (?:named |called )?([a-zA-Z0-9\s]+?)(?:\s|$)/i);
  if (namedMatch) {
    return namedMatch[1].trim();
  }

  return undefined;
}

function extractComparisonType(input: string): ComparisonType {
  if (input.includes("day") || input.includes("today") || input.includes("yesterday")) {
    return "day_over_day";
  }
  if (input.includes("week")) {
    return "week_over_week";
  }
  if (input.includes("month")) {
    return "month_over_month";
  }
  return "period_comparison";
}