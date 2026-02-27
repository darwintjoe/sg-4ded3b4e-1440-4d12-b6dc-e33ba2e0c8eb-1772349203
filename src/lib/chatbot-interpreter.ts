import { db } from "./db";
import type { 
  ParsedQuery, 
  QueryResult, 
  TimeRange, 
  Transaction,
  QueryIntent,
  ComparisonType,
  CartItem,
  PaymentRecord
} from "@/types";
import { 
  format, 
  subDays, 
  subWeeks, 
  subMonths,
  differenceInDays,
  isValid,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
} from "date-fns";

// --- Missing Helpers Definition ---

// Levenshtein distance for typo tolerance (needed for predictIntent in this file too)
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

function fuzzyMatch(input: string, target: string): boolean {
  if (input === target) return true;
  if (input.includes(target) || target.includes(input)) return true;
  
  const distance = levenshteinDistance(input, target);
  const maxDistance = Math.max(2, Math.floor(target.length * 0.3));
  return distance <= maxDistance;
}

// Helper to get sales with support for date range
async function getSales(timeRange: TimeRange): Promise<Transaction[]> {
  if (timeRange.type === "all_time") {
    // If all time, we might want to limit to reasonable history or fetch all
    // For now, let's fetch a wide range or use a method that returns all if db supports it
    // Assuming db.getSales() without args returns all or we pass a wide range
    // Let's assume we pass a very old start date
    return await db.getSales(new Date(2000, 0, 1), new Date());
  }
  
  if (timeRange.startDate && timeRange.endDate) {
    return await db.getSales(timeRange.startDate, timeRange.endDate);
  }
  
  // Fallback to today
  const now = new Date();
  return await db.getSales(startOfDay(now), endOfDay(now));
}

// Helper to aggregate item sales
function aggregateItemSales(sales: Transaction[]): Map<string, { name: string; quantity: number; revenue: number }> {
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  sales.forEach(t => {
    t.items.forEach(item => {
      const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
      itemMap.set(item.name, {
        name: item.name,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.totalPrice
      });
    });
  });
  
  return itemMap;
}

// --- End Helpers ---

// Helper to generate smart answer prefixes
function generateAnswerPrefix(query: ParsedQuery): string {
  const { intent, limit, timeRange, entity } = query;
  
  // Format time range
  const timeStr = formatTimeRange(timeRange);
  const dateRange = (timeRange.startDate && timeRange.endDate)
    ? ` (${format(timeRange.startDate, 'MMM d')} - ${format(timeRange.endDate, 'MMM d')})`
    : "";

  switch (intent) {
    case "top_items":
      return `**${limit || 5} Best Selling Item${(limit || 5) > 1 ? "s" : ""} ${timeStr}${dateRange}:**\n\n`;
    
    case "bottom_items":
      return `**${limit || 5} Slowest Moving Item${(limit || 5) > 1 ? "s" : ""} ${timeStr}${dateRange}:**\n\n`;
    
    case "revenue":
      return `**Total Revenue ${timeStr}${dateRange}:**\n\n`;
    
    case "transaction_history":
      return `**${limit || 5} Latest Transaction${(limit || 5) > 1 ? "s" : ""}${dateRange ? dateRange : " (All Time)"}:**\n\n`;
    
    case "item_performance":
      return entity 
        ? `**"${entity}" Performance ${timeStr}${dateRange}:**\n\n`
        : `**Item Performance ${timeStr}${dateRange}:**\n\n`;
    
    case "employee_performance":
      return `**Employee Performance ${timeStr}${dateRange}:**\n\n`;
    
    case "attendance":
      return `**Attendance Records ${timeStr}${dateRange}:**\n\n`;
    
    case "trends":
      return `**Sales Trends ${timeStr}${dateRange}:**\n\n`;
    
    case "peak_hours":
      return `**Peak Hours Analysis ${timeStr}${dateRange}:**\n\n`;
    
    case "payment_method":
      return `**Payment Method Breakdown ${timeStr}${dateRange}:**\n\n`;
    
    case "comparison":
      return `**Comparison ${timeStr}:**\n\n`;
    
    default:
      return "";
  }
}

// Polite out-of-context responses (varied)
function getOutOfContextResponse(): string {
  const responses = [
    "I'm not trained to answer that, my apology. I can only help with business data like sales, inventory, and reports.",
    
    "I appreciate the question, but I'm specifically designed for business analytics. Try asking about revenue, top items, or employee performance!",
    
    "That's outside my expertise, sorry! I focus on helping with sales data, transactions, and business reports. What would you like to know about your store?",
    
    "I'm not able to help with that, my apologies. I specialize in business insights like sales trends, inventory, and performance metrics.",
    
    "Unfortunately, I'm not trained for that type of question. I'm here to help analyze your sales, items, and business performance. What can I help you with?"
  ];
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Predict intent for unclear queries
function predictIntent(input: string): string[] {
  const suggestions: string[] = [];
  const words = input.toLowerCase().split(/\s+/);
  
  // Check for partial matches with common intents
  const keywords: Record<string, string[]> = {
    "revenue": ["revenue", "sales", "income", "money", "profit"],
    "top items": ["top", "best", "item", "product", "selling"],
    "transactions": ["transaction", "sale", "receipt", "order"],
    "employees": ["employee", "staff", "cashier", "worker"],
    "attendance": ["attendance", "shift", "work", "present"],
    "trends": ["trend", "growth", "pattern"],
    "payment method": ["payment", "cash", "card"]
  };
  
  for (const [intent, intentKeywords] of Object.entries(keywords)) {
    const matchCount = words.filter(word => 
      intentKeywords.some(kw => fuzzyMatch(word, kw))
    ).length;
    
    if (matchCount > 0) {
      suggestions.push(intent);
    }
  }
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}

export async function executeQuery(query: ParsedQuery): Promise<QueryResult> {
  try {
    switch (query.intent) {
      case "help":
        return generateHelpResponse();
      
      case "polite_response":
        return {
          type: "text",
          text: "You're welcome! Let me know if you need anything else.",
          timeRange: query.timeRange
        };

      case "out_of_context":
        return {
          type: "text",
          text: getOutOfContextResponse(),
          timeRange: query.timeRange
        };

      case "transaction_detail":
        return await handleTransactionDetail(query);

      case "transaction_history":
        return await handleTransactionHistory(query);

      case "comparison":
        return await handleComparison(query);

      case "revenue":
        return await handleRevenue(query);

      case "transactions":
        return await handleTransactionCount(query);

      case "top_items":
        return await handleTopItems(query);

      case "bottom_items":
        return await handleBottomItems(query);

      case "item_performance":
        return await handleItemPerformance(query);

      case "category_analysis":
        return await handleCategoryAnalysis(query);

      case "payment_method":
        return await handlePaymentMethods(query);

      case "employee_performance":
        return await handleEmployeeSales(query);

      case "attendance":
        return await handleAttendance(query);
      
      case "trends":
        return await handleTrends(query);

      case "peak_hours":
        return await handlePeakHours(query);

      case "unknown":
      default: {
        // Check if this is truly out of context or just unclear
        const suggestions = predictIntent(query.originalInput || "");
        
        if (suggestions.length > 0) {
          // Unclear intent - provide suggestions
          const suggestionText = suggestions.map(s => `"${s}"`).join(", ");
          return {
            type: "text",
            text: `I'm not quite sure what you're asking. Did you mean: ${suggestionText}?\n\nTry being more specific, like:\n• "Top 10 items this month"\n• "Revenue yesterday"\n• "Latest transactions"`,
            data: null
          };
        } else {
          // Completely out of context
          return {
            type: "text",
            text: getOutOfContextResponse(),
            data: null
          };
        }
      }
    }
  } catch (error) {
    console.error("Interpreter Error:", error);
    return {
      type: "error",
      text: "I encountered an error analyzing your data. Please try again.",
      error: String(error)
    };
  }
}

// --- Handlers ---

async function handleTransactionDetail(query: ParsedQuery): Promise<QueryResult> {
  const receiptNumber = query.filters?.receiptNumber;
  
  if (!receiptNumber) {
    return { type: "text", text: "Please specify a receipt number." };
  }

  const sales = await db.getSales(); 
  const transaction = sales.find(t => t.id === receiptNumber);

  if (!transaction) {
    return { type: "text", text: `I couldn't find receipt #${receiptNumber}.` };
  }

  const dateStr = format(new Date(transaction.timestamp), "MMM d, yyyy h:mm a");
  
  // Items list with correct property: basePrice
  const itemsList = transaction.items.map(i => 
    `- ${i.quantity}x ${i.name} @ ${formatCurrency(i.basePrice)} = ${formatCurrency(i.totalPrice)}`
  ).join("\n");

  // Payment breakdown
  const paymentsList = transaction.payments.map(p =>
    `- ${p.method}: ${formatCurrency(p.amount)}`
  ).join("\n");

  // Build detailed response
  let text = `**Receipt #${transaction.id}**\n` +
             `Date: ${dateStr}\n` +
             `Cashier: ${transaction.cashierName}\n\n` +
             `**Items:**\n${itemsList}\n\n`;

  // Add subtotal if different from total
  if (transaction.subtotal !== undefined && transaction.subtotal !== transaction.total) {
    text += `Subtotal: ${formatCurrency(transaction.subtotal)}\n`;
  }

  // Add tax1 if applicable
  if (transaction.tax1 && transaction.tax1 > 0) {
    text += `Tax1: ${formatCurrency(transaction.tax1)}\n`;
  }
  
  // Add tax2 if applicable
  if (transaction.tax2 && transaction.tax2 > 0) {
    text += `Tax2: ${formatCurrency(transaction.tax2)}\n`;
  }
  
  // Fallback: show combined tax if no separate values (backward compat)
  if ((!transaction.tax1 && !transaction.tax2) && transaction.tax && transaction.tax > 0) {
    text += `Tax: ${formatCurrency(transaction.tax)}\n`;
  }

  text += `\n**Total: ${formatCurrency(transaction.total)}**\n\n`;
  text += `**Payment Method(s):**\n${paymentsList}`;

  // Add change if applicable
  if (transaction.change && transaction.change > 0) {
    text += `\n\nChange: ${formatCurrency(transaction.change)}`;
  }

  return { type: "text", text, data: transaction };
}

async function handleTransactionHistory(query: ParsedQuery): Promise<QueryResult> {
  const sales = await getSales(query.timeRange);
  const recentSales = sales
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, query.limit || 5);

  if (recentSales.length === 0) {
    return {
      type: "text",
      text: `No transactions found${query.timeRange ? ` for ${formatTimeRange(query.timeRange)}` : ""}.`,
      data: null,
      timeRange: query.timeRange
    };
  }

  const prefix = generateAnswerPrefix(query);
  const list = recentSales
    .map((sale, i) => {
      const date = new Date(sale.timestamp).toLocaleString("id-ID");
      const itemCount = sale.items.length;
      return `${i + 1}. **Receipt #${sale.id}** - ${date}\n   ${itemCount} item${itemCount !== 1 ? "s" : ""}, Total: Rp ${sale.total.toLocaleString("id-ID")}`;
    })
    .join("\n\n");

  return {
    type: "text",
    text: `${prefix}${list}`,
    data: recentSales,
    timeRange: query.timeRange
  };
}

async function handleComparison(query: ParsedQuery): Promise<QueryResult> {
  const range1 = query.timeRange;
  const range2 = query.compareTimeRange || getPreviousPeriod(range1);
  
  const sales1 = await db.getSales(range1.startDate, range1.endDate);
  const sales2 = await db.getSales(range2.startDate, range2.endDate);

  const total1 = sales1.reduce((sum, t) => sum + t.total, 0);
  const total2 = sales2.reduce((sum, t) => sum + t.total, 0);
  
  const diff = total1 - total2;
  const percentChange = total2 > 0 ? ((diff / total2) * 100).toFixed(1) : "N/A";
  const icon = diff >= 0 ? "📈" : "📉";

  const period1Name = formatTimeRange(range1);
  const period2Name = formatTimeRange(range2);

  const text = `**Comparison: ${period1Name} vs ${period2Name}**\n\n` +
               `• ${period1Name}: **${formatCurrency(total1)}**\n` +
               `• ${period2Name}: **${formatCurrency(total2)}**\n\n` +
               `Difference: ${icon} **${formatCurrency(Math.abs(diff))}** (${diff >= 0 ? '+' : ''}${percentChange}%)`;

  return {
    type: "text",
    text,
    data: {
      period1: { name: period1Name, value: total1, sales: sales1 },
      period2: { name: period2Name, value: total2, sales: sales2 }
    }
  };
}

async function handleRevenue(query: ParsedQuery): Promise<QueryResult> {
  const sales = await getSales(query.timeRange);
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const count = sales.length;

  const prefix = generateAnswerPrefix(query);
  const text = `${prefix}Total revenue is **Rp ${total.toLocaleString("id-ID")}** across ${count} transaction${count !== 1 ? "s" : ""}.`;

  return {
    type: "text",
    text,
    data: { total, count, sales },
    timeRange: query.timeRange
  };
}

async function handleTransactionCount(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const count = sales.length;
  
  return {
    type: "text",
    text: `There were **${count} transactions** during ${formatTimeRange(query.timeRange)}.`,
    data: { count },
    timeRange: query.timeRange
  };
}

async function handleTopItems(query: ParsedQuery): Promise<QueryResult> {
  const sales = await getSales(query.timeRange);
  const itemMap = aggregateItemSales(sales);
  const items = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, query.limit || 5);

  if (items.length === 0) {
    return {
      type: "text",
      text: `No items sold during ${formatTimeRange(query.timeRange)}.`,
      data: null,
      timeRange: query.timeRange
    };
  }

  const prefix = generateAnswerPrefix(query);
  const list = items
    .map((item, i) => `${i + 1}. **${item.name}**: ${item.quantity} sold (Rp ${item.revenue.toLocaleString("id-ID")})`)
    .join("\n");

  return {
    type: "text",
    text: `${prefix}${list}`,
    data: items,
    timeRange: query.timeRange
  };
}

async function handleBottomItems(query: ParsedQuery): Promise<QueryResult> {
  const sales = await getSales(query.timeRange);
  const itemMap = aggregateItemSales(sales);
  const items = Array.from(itemMap.values())
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, query.limit || 5);

  if (items.length === 0) {
    return {
      type: "text",
      text: `No items sold during ${formatTimeRange(query.timeRange)}.`,
      data: null,
      timeRange: query.timeRange
    };
  }

  const prefix = generateAnswerPrefix(query);
  const list = items
    .map((item, i) => `${i + 1}. **${item.name}**: ${item.quantity} sold (Rp ${item.revenue.toLocaleString("id-ID")})`)
    .join("\n");

  return {
    type: "text",
    text: `${prefix}${list}`,
    data: items,
    timeRange: query.timeRange
  };
}

async function handleItemPerformance(query: ParsedQuery): Promise<QueryResult> {
  const itemName = query.entity;
  if (!itemName) return { type: "text", text: "Which item would you like to check?" };

  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  let totalQty = 0;
  let totalRev = 0;

  sales.forEach(t => {
    t.items.forEach(item => {
      if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
        totalQty += item.quantity;
        totalRev += item.totalPrice;
      }
    });
  });

  if (totalQty === 0) {
    return { type: "text", text: `No sales found for "${itemName}" in ${formatTimeRange(query.timeRange)}.` };
  }

  return {
    type: "text",
    text: `**${itemName}** performance (${formatTimeRange(query.timeRange)}):\n\n` +
          `• Quantity Sold: **${totalQty}**\n` +
          `• Total Revenue: **${formatCurrency(totalRev)}**`,
    data: { name: itemName, quantity: totalQty, revenue: totalRev }
  };
}

async function handleCategoryAnalysis(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  // Need item details to get category. 
  // Assumption: We might need to fetch items database to map category if not in cart item.
  // For now, let's assume we can't easily get category unless it's stored on item.
  // We'll skip deep category analysis or try to infer.
  
  // Real implementation would join with Items store. For now, simplistic message.
  return { 
    type: "text", 
    text: "Category analysis requires joining item data. (Placeholder)" 
  };
}

async function handlePaymentMethods(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const methods = new Map<string, number>();

  sales.forEach(t => {
    t.payments.forEach(p => {
      const current = methods.get(p.method) || 0;
      methods.set(p.method, current + p.amount);
    });
  });

  const data = Array.from(methods.entries()).map(([method, amount]) => ({ name: method, value: amount }));
  const text = data.map(d => `- **${d.name}**: ${formatCurrency(d.value)}`).join("\n");

  return {
    type: "text",
    text: `Payment Methods (${formatTimeRange(query.timeRange)}):\n\n${text}`,
    data
  };
}

async function handleEmployeeSales(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const employees = new Map<string, number>();

  sales.forEach(t => {
    const name = t.cashierName || "Unknown";
    const current = employees.get(name) || 0;
    employees.set(name, current + t.total);
  });

  const data = Array.from(employees.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const text = data.map(d => `- **${d.name}**: ${formatCurrency(d.value)}`).join("\n");

  return {
    type: "text",
    text: `Sales by Employee (${formatTimeRange(query.timeRange)}):\n\n${text}`,
    data
  };
}

async function handleAttendance(query: ParsedQuery): Promise<QueryResult> {
  const attendance = await db.getAttendance(query.timeRange.startDate, query.timeRange.endDate);
  
  if (attendance.length === 0) {
    return { type: "text", text: "No attendance records found for this period." };
  }

  const count = attendance.length;
  const uniqueEmployees = new Set(attendance.map(a => a.employeeName)).size;

  return {
    type: "text",
    text: `Attendance Report (${formatTimeRange(query.timeRange)}):\n` +
          `- Total Shifts: ${count}\n` +
          `- Active Employees: ${uniqueEmployees}`,
    data: attendance
  };
}

async function handleTrends(query: ParsedQuery): Promise<QueryResult> {
  // Simple daily trend
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  
  if (sales.length === 0) {
    return {
      type: "text",
      text: `No sales data found for ${formatTimeRange(query.timeRange)}.`,
      timeRange: query.timeRange
    };
  }

  const daily = new Map<string, number>();

  sales.forEach(t => {
    const day = format(new Date(t.timestamp), "yyyy-MM-dd");
    daily.set(day, (daily.get(day) || 0) + t.total);
  });

  const data = Array.from(daily.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate totals and averages
  const totalRevenue = sales.reduce((sum, t) => sum + t.total, 0);
  const avgDailyRevenue = totalRevenue / data.length;
  const totalTransactions = sales.length;

  // Find best and worst days
  const sortedByRevenue = [...data].sort((a, b) => b.value - a.value);
  const bestDay = sortedByRevenue[0];
  const worstDay = sortedByRevenue[sortedByRevenue.length - 1];

  let text = `**Sales Trend (${formatTimeRange(query.timeRange)})**\n\n`;
  text += `📊 **Summary:**\n`;
  text += `• Total Revenue: ${formatCurrency(totalRevenue)}\n`;
  text += `• Total Transactions: ${totalTransactions}\n`;
  text += `• Days with Sales: ${data.length}\n`;
  text += `• Average Daily Revenue: ${formatCurrency(avgDailyRevenue)}\n\n`;
  
  text += `📈 **Best Day:** ${format(new Date(bestDay.date), "MMM d, yyyy")} - ${formatCurrency(bestDay.value)}\n`;
  text += `📉 **Slowest Day:** ${format(new Date(worstDay.date), "MMM d, yyyy")} - ${formatCurrency(worstDay.value)}`;

  return {
    type: "text",
    text,
    data,
    timeRange: query.timeRange
  };
}

async function handlePeakHours(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const hours = new Array(24).fill(0);

  sales.forEach(t => {
    const hour = new Date(t.timestamp).getHours();
    hours[hour]++;
  });

  const peakHour = hours.indexOf(Math.max(...hours));
  
  return {
    type: "text",
    text: `Peak sales hour is around **${peakHour}:00 - ${peakHour + 1}:00** with ${hours[peakHour]} transactions.`,
    data: hours.map((count, hour) => ({ hour, count }))
  };
}

// --- Helpers ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatTimeRange(range: TimeRange): string {
  if (range.type === "today") return "Today";
  if (range.type === "yesterday") return "Yesterday";
  if (range.type === "this_week") return "This Week";
  if (range.type === "last_week") return "Last Week";
  if (range.type === "this_month") return "This Month";
  if (range.type === "last_month") return "Last Month";
  if (range.type === "all_time") return "All Time";
  
  if (range.startDate && range.endDate) {
    return `${format(range.startDate, "MMM d")} - ${format(range.endDate, "MMM d")}`;
  }
  return "Selected Period";
}

function generateHelpResponse(): QueryResult {
  const text = `
**Here are some things you can ask me:**

💰 **Sales & Revenue**
- "How much did we sell today?"
- "Revenue this month vs last month"
- "Show me sales trends for last week"

📦 **Inventory & Items**
- "What are the top selling items?"
- "How many 'Coffees' did we sell yesterday?"
- "Best selling category this week"

👥 **Staff & Operations**
- "Who sold the most today?"
- "Show attendance for this week"
- "When is the busiest time of day?"

🔍 **Details**
- "Show last 5 transactions"
- "Details of receipt #1024"
`;
  return { type: "text", text };
}

function getPreviousPeriod(range: TimeRange): TimeRange {
  // Logic to determine comparable previous period
  const now = new Date();
  
  if (range.type === "today") return { type: "yesterday", startDate: subDays(now, 1), endDate: endOfDay(subDays(now, 1)) };
  if (range.type === "this_week") return { type: "last_week", ...getLastWeekRange() };
  if (range.type === "this_month") return { type: "last_month", ...getLastMonthRange() };
  
  // Custom range fallback: same duration before start date
  if (range.startDate && range.endDate) {
    const duration = differenceInDays(range.endDate, range.startDate);
    const end = subDays(range.startDate, 1);
    const start = subDays(end, duration);
    return { type: "custom", startDate: start, endDate: end };
  }

  return { type: "yesterday" };
}

function getLastWeekRange() {
  const now = new Date();
  const start = subWeeks(startOfWeek(now), 1);
  const end = endOfWeek(start);
  return { startDate: start, endDate: end };
}

function getLastMonthRange() {
  const now = new Date();
  const start = subMonths(startOfMonth(now), 1);
  const end = endOfMonth(start);
  return { startDate: start, endDate: end };
}