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
  | "transaction_history"
  | "transaction_detail"
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
  | "polite_response"
  | "out_of_context"
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
  receiptNumber?: number;
}

const HELP_KEYWORDS = ["help", "what can you do", "commands", "examples", "guide"];

const POLITE_KEYWORDS = ["thank you", "thanks", "thx", "appreciate", "appreciated", "good job", "great job", "well done", "awesome", "excellent", "perfect", "nice", "cool", "helpful"];

const OUT_OF_CONTEXT_KEYWORDS = {
  weather: ["weather", "temperature", "forecast", "rain", "sunny"],
  personal: ["how are you", "who are you", "your name", "what's your name"],
  general: ["joke", "story", "recipe", "news", "time", "date today", "day today"],
  unrelated: ["movie", "music", "game", "sport", "football", "basketball"]
};

const REVENUE_KEYWORDS = ["revenue", "sales", "income", "earnings", "total sales", "how much"];
const TRANSACTION_KEYWORDS = ["transaction", "transactions", "sales count", "how many sales"];
const TRANSACTION_HISTORY_KEYWORDS = ["show", "list", "display", "recent", "latest", "sales", "sale"];
const TRANSACTION_DETAIL_KEYWORDS = ["detail", "details", "breakdown", "drill down", "expand", "full"];
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

  if (fuzzyMatchKeywords(lowerInput, HELP_KEYWORDS)) {
    return {
      intent: "help",
      timeRange: { type: "today" },
    };
  }

  // Check for polite responses
  if (fuzzyMatchKeywords(lowerInput, POLITE_KEYWORDS)) {
    return {
      intent: "polite_response",
      timeRange: { type: "today" },
    };
  }

  // Check for out-of-context queries
  const isOutOfContext = Object.values(OUT_OF_CONTEXT_KEYWORDS).some(keywords =>
    fuzzyMatchKeywords(lowerInput, keywords)
  );
  
  if (isOutOfContext) {
    return {
      intent: "out_of_context",
      timeRange: { type: "today" },
    };
  }

  const timeRange = extractTimeRange(lowerInput);
  const limit = extractLimit(lowerInput);
  const entity = extractEntity(lowerInput);

  // Transaction detail: "show details of #2881" or "detail receipt 2881"
  const receiptNumber = extractReceiptNumber(lowerInput);
  if (fuzzyMatchKeywords(lowerInput, TRANSACTION_DETAIL_KEYWORDS) && receiptNumber) {
    return {
      intent: "transaction_detail",
      timeRange,
      filters: { receiptNumber }
    };
  }

  if (fuzzyMatchKeywords(lowerInput, COMPARISON_KEYWORDS)) {
    return {
      intent: "comparison",
      timeRange,
      comparison: extractComparisonType(lowerInput),
      entity,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, PEAK_KEYWORDS)) {
    return {
      intent: "peak_hours",
      timeRange,
    };
  }

  // Transaction history: "show last 10 transactions" or "show last 10 sales"
  const hasListContext = fuzzyMatchKeywords(lowerInput, ["show", "list", "display", "recent", "latest"]);
  const hasTransactionOrSales = fuzzyMatchKeywords(lowerInput, ["transaction", "transactions", "sale", "sales"]);
  const hasLastX = /last (\d+)/.test(lowerInput);
  
  if ((hasListContext && hasTransactionOrSales) || (hasLastX && hasTransactionOrSales)) {
    return {
      intent: "transaction_history",
      timeRange,
      limit: extractLimit(lowerInput) || 10,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, ATTENDANCE_KEYWORDS)) {
    return {
      intent: "attendance",
      timeRange,
      entity,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, EMPLOYEE_KEYWORDS)) {
    return {
      intent: "employee_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, PAYMENT_KEYWORDS)) {
    return {
      intent: "payment_methods",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, CATEGORY_KEYWORDS)) {
    return {
      intent: "category_analysis",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, TOP_ITEMS_KEYWORDS) && fuzzyMatchKeywords(lowerInput, ITEM_KEYWORDS)) {
    return {
      intent: "top_items",
      timeRange,
      limit,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, ITEM_KEYWORDS)) {
    return {
      intent: "item_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, TRANSACTION_KEYWORDS)) {
    return {
      intent: "transactions",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, REVENUE_KEYWORDS)) {
    return {
      intent: "revenue",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(lowerInput, TREND_KEYWORDS)) {
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
  if (fuzzyMatchKeywords(input, TIME_ALL_TIME)) {
    return { type: "all_time" };
  }
  
  if (fuzzyMatchKeywords(input, TIME_TODAY)) {
    return { type: "today" };
  }
  if (fuzzyMatchKeywords(input, TIME_YESTERDAY)) {
    return { type: "yesterday" };
  }
  if (fuzzyMatchKeywords(input, TIME_THIS_WEEK)) {
    return { type: "this_week" };
  }
  if (fuzzyMatchKeywords(input, TIME_LAST_WEEK)) {
    return { type: "last_week" };
  }
  if (fuzzyMatchKeywords(input, TIME_THIS_MONTH)) {
    return { type: "this_month" };
  }
  if (fuzzyMatchKeywords(input, TIME_LAST_MONTH)) {
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

function extractReceiptNumber(input: string): number | undefined {
  // Match patterns like: #2881, receipt 2881, receipt #2881, transaction 2881
  const patterns = [
    /#(\d+)/,                           // #2881
    /receipt\s*#?(\d+)/i,               // receipt 2881, receipt #2881
    /transaction\s*#?(\d+)/i,           // transaction 2881
    /(?:detail|details)\s+(?:of\s+)?#?(\d+)/i  // detail of 2881, details 2881
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
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

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to change one word into the other
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize word to handle plural/singular variations
 * Removes common plural suffixes and normalizes spelling
 */
function normalizeWord(word: string): string {
  let normalized = word.toLowerCase().trim();
  
  // Handle plural forms
  if (normalized.endsWith("ies")) {
    normalized = normalized.slice(0, -3) + "y"; // categories → category
  } else if (normalized.endsWith("es")) {
    normalized = normalized.slice(0, -2); // sales → sale, boxes → box
  } else if (normalized.endsWith("s") && normalized.length > 3) {
    normalized = normalized.slice(0, -1); // items → item, days → day
  }
  
  return normalized;
}

/**
 * Check if two words are similar enough (handles typos and variations)
 */
function isSimilarWord(word1: string, word2: string, maxDistance: number = 2): boolean {
  const norm1 = normalizeWord(word1);
  const norm2 = normalizeWord(word2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Length-based threshold for typo tolerance
  const minLength = Math.min(norm1.length, norm2.length);
  const threshold = minLength <= 4 ? 1 : maxDistance;
  
  // Calculate edit distance
  const distance = levenshteinDistance(norm1, norm2);
  
  return distance <= threshold;
}

/**
 * Enhanced keyword matching with fuzzy matching support
 * Handles typos, plural/singular variations, and word similarities
 */
function fuzzyMatchKeywords(input: string, keywords: string[]): boolean {
  const inputWords = input.toLowerCase().split(/\s+/);
  
  return keywords.some((keyword) => {
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    
    // For multi-word keywords (e.g., "sales count")
    if (keywordWords.length > 1) {
      // Check if all words in the keyword phrase appear in the input with fuzzy matching
      return keywordWords.every((keywordWord) =>
        inputWords.some((inputWord) => isSimilarWord(inputWord, keywordWord))
      );
    }
    
    // For single-word keywords
    return inputWords.some((inputWord) => isSimilarWord(inputWord, keyword));
  });
}