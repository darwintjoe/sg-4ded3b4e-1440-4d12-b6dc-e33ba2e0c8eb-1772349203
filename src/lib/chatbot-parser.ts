import { 
  ParsedQuery, 
  QueryIntent, 
  TimeRange, 
  QueryResult 
} from "@/types";

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

// Intent keywords
const INTENT_REVENUE = ["revenue", "sales", "income", "earnings", "money", "profit", "total sales"];
const INTENT_TRANSACTIONS = ["transactions", "orders", "sales count", "number of sales", "how many sales"];
const INTENT_TOP_ITEMS = ["best selling", "top selling", "most popular", "best seller", "top item", "most sold"];
const INTENT_LOW_STOCK = ["low stock", "inventory", "stock level", "running low", "out of stock", "restock"];
const INTENT_EMPLOYEE_SALES = ["employee sales", "staff sales", "who sold", "salesperson", "cashier sales", "employee performance"];
const INTENT_ATTENDANCE = ["attendance", "who worked", "shift", "clock in", "clock out", "working hours"];
const INTENT_PAYMENT_METHODS = ["payment methods", "payment breakdown", "how people paid", "cash vs card", "payment types"];
const INTENT_COMPARE = ["compare", "comparison", "vs", "versus", "difference", "contrast", "against", "compared to", "vs.", "between"];
const INTENT_HELP = ["help", "what can you do", "commands", "how to use", "guide"];

export function parseQuery(input: string): ParsedQuery {
  const normalizedInput = input.toLowerCase().trim();

  // Check for comparison intent first (before other intents)
  if (fuzzyMatchKeywords(normalizedInput, INTENT_COMPARE)) {
    const { primary, compare } = extractCompareTimeRanges(normalizedInput);
    
    // Determine what's being compared
    let subIntent: QueryIntent = "revenue"; // default
    
    if (fuzzyMatchKeywords(normalizedInput, INTENT_TOP_ITEMS)) {
      subIntent = "top_items";
    } else if (fuzzyMatchKeywords(normalizedInput, INTENT_PAYMENT_METHODS)) {
      subIntent = "payment_methods";
    } else if (fuzzyMatchKeywords(normalizedInput, INTENT_TRANSACTIONS)) {
      subIntent = "transactions";
    } else if (fuzzyMatchKeywords(normalizedInput, INTENT_EMPLOYEE_SALES)) {
      subIntent = "employee_sales";
    }
    
    return {
      intent: "compare",
      timeRange: primary,
      compareTimeRange: compare,
      entity: subIntent, // Store what to compare in entity field
      limit: extractLimit(normalizedInput),
    };
  }

  // Check specific intents
  if (fuzzyMatchKeywords(normalizedInput, INTENT_REVENUE)) {
    return {
      intent: "revenue",
      timeRange: extractTimeRange(normalizedInput),
      limit: extractLimit(normalizedInput),
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, HELP_KEYWORDS)) {
    return {
      intent: "help",
      timeRange: { type: "today" },
    };
  }

  const timeRange = extractTimeRange(normalizedInput);
  const limit = extractLimit(normalizedInput);
  const entity = extractEntity(normalizedInput);

  // Transaction detail: "show details of #2881" or "detail receipt 2881"
  const receiptNumber = extractReceiptNumber(normalizedInput);
  if (fuzzyMatchKeywords(normalizedInput, TRANSACTION_DETAIL_KEYWORDS) && receiptNumber) {
    return {
      intent: "transaction_detail",
      timeRange,
      filters: { receiptNumber }
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, COMPARISON_KEYWORDS)) {
    return {
      intent: "comparison",
      timeRange,
      comparison: extractComparisonType(normalizedInput),
      entity,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, PEAK_KEYWORDS)) {
    return {
      intent: "peak_hours",
      timeRange,
    };
  }

  // Transaction history: "show last 10 transactions" or "show last 10 sales"
  const hasListContext = fuzzyMatchKeywords(normalizedInput, ["show", "list", "display", "recent", "latest"]);
  const hasTransactionOrSales = fuzzyMatchKeywords(normalizedInput, ["transaction", "transactions", "sale", "sales"]);
  const hasLastX = /last (\d+)/.test(normalizedInput);
  
  if ((hasListContext && hasTransactionOrSales) || (hasLastX && hasTransactionOrSales)) {
    return {
      intent: "transaction_history",
      timeRange,
      limit: extractLimit(normalizedInput) || 10,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, ATTENDANCE_KEYWORDS)) {
    return {
      intent: "attendance",
      timeRange,
      entity,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, EMPLOYEE_KEYWORDS)) {
    return {
      intent: "employee_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, PAYMENT_KEYWORDS)) {
    return {
      intent: "payment_methods",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, CATEGORY_KEYWORDS)) {
    return {
      intent: "category_analysis",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, TOP_ITEMS_KEYWORDS) && fuzzyMatchKeywords(normalizedInput, ITEM_KEYWORDS)) {
    return {
      intent: "top_items",
      timeRange,
      limit,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, ITEM_KEYWORDS)) {
    return {
      intent: "item_performance",
      timeRange,
      entity,
      limit,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, TRANSACTION_KEYWORDS)) {
    return {
      intent: "transactions",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, REVENUE_KEYWORDS)) {
    return {
      intent: "revenue",
      timeRange,
    };
  }

  if (fuzzyMatchKeywords(normalizedInput, TREND_KEYWORDS)) {
    return {
      intent: "trends",
      timeRange,
      entity,
    };
  }

  // Check for polite responses AFTER all specific intents
  if (fuzzyMatchKeywords(normalizedInput, POLITE_KEYWORDS)) {
    return {
      intent: "polite_response",
      timeRange: { type: "today" },
    };
  }

  // Check for out-of-context queries AFTER all specific intents
  const isOutOfContext = Object.values(OUT_OF_CONTEXT_KEYWORDS).some(keywords =>
    fuzzyMatchKeywords(normalizedInput, keywords)
  );
  
  if (isOutOfContext) {
    return {
      intent: "out_of_context",
      timeRange: { type: "today" },
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
  // Check specific time ranges BEFORE "all time" to prioritize explicit mentions
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

  const lastNDaysMatch = input.match(/last (\d+) days?/i);
  if (lastNDaysMatch) {
    return { type: "last_n_days", days: parseInt(lastNDaysMatch[1]) };
  }

  // Check "all time" last to avoid overriding specific time mentions
  if (fuzzyMatchKeywords(input, TIME_ALL_TIME)) {
    return { type: "all_time" };
  }

  return { type: "today" };
}

// Extract two time ranges for comparison queries
function extractCompareTimeRanges(input: string): { primary: TimeRange; compare: TimeRange } {
  const lowerInput = input.toLowerCase();
  
  // Split by comparison keywords
  const splitPatterns = [
    /\s+(vs\.?|versus|compared to|against|with)\s+/i,
    /\s+and\s+/i
  ];
  
  let parts: string[] = [input];
  for (const pattern of splitPatterns) {
    if (pattern.test(input)) {
      parts = input.split(pattern).filter(p => p && !pattern.test(p));
      break;
    }
  }
  
  // If we have two clear parts, extract time from each
  if (parts.length >= 2) {
    const primary = extractTimeRange(parts[0]);
    const compare = extractTimeRange(parts[1]);
    return { primary, compare };
  }
  
  // Handle "month before", "week before", "previous month" patterns
  if (lowerInput.includes("month before") || lowerInput.includes("previous month")) {
    const primary = extractTimeRange(input);
    return { 
      primary, 
      compare: primary.type === "this_month" ? { type: "last_month" } : { type: "last_month" }
    };
  }
  
  if (lowerInput.includes("week before") || lowerInput.includes("previous week")) {
    const primary = extractTimeRange(input);
    return { 
      primary, 
      compare: primary.type === "this_week" ? { type: "last_week" } : { type: "last_week" }
    };
  }
  
  // Default: compare with previous period
  const primary = extractTimeRange(input);
  let compare: TimeRange;
  
  switch (primary.type) {
    case "today":
      compare = { type: "yesterday" };
      break;
    case "this_week":
      compare = { type: "last_week" };
      break;
    case "this_month":
      compare = { type: "last_month" };
      break;
    default:
      compare = { type: "all_time" };
  }
  
  return { primary, compare };
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
 * Stricter matching for very short words to prevent false positives
 */
function isSimilarWord(word1: string, word2: string, maxDistance: number = 2): boolean {
  const norm1 = normalizeWord(word1);
  const norm2 = normalizeWord(word2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Stricter threshold for very short words (2-3 chars)
  const minLength = Math.min(norm1.length, norm2.length);
  let threshold: number;
  
  if (minLength <= 2) {
    threshold = 0; // No fuzzy matching for 1-2 char words (exact match only)
  } else if (minLength === 3) {
    threshold = 1; // Allow 1 edit for 3-char words
  } else if (minLength <= 5) {
    threshold = 1; // Allow 1 edit for 4-5 char words
  } else {
    threshold = maxDistance; // Allow 2 edits for longer words
  }
  
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