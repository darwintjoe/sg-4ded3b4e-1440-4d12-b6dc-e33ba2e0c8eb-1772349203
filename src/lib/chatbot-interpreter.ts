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
          text: "I can only help you with your business data, sales, and inventory. Try asking about revenue, top items, or employee performance.",
          timeRange: query.timeRange
        };

      case "transaction_detail":
        return await handleTransactionDetail(query);

      case "transaction_history":
        return await handleTransactionHistory(query);

      case "compare":
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

      case "payment_methods":
        return await handlePaymentMethods(query);

      case "employee_sales":
        return await handleEmployeeSales(query);

      case "attendance":
        return await handleAttendance(query);
      
      case "trends":
        return await handleTrends(query);

      case "peak_hours":
        return await handlePeakHours(query);

      case "unknown":
      default:
        return {
          type: "text",
          text: "I'm not sure I understand that. Try asking 'What were the sales today?' or 'Top items this month'.",
          timeRange: query.timeRange
        };
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

  // Add tax if applicable
  if (transaction.tax && transaction.tax > 0) {
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
  const limit = query.limit || 5;
  const sales = query.timeRange.type === "all_time" 
    ? await db.getSales()
    : await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  
  // Sort descending by time
  const recentSales = sales.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

  if (recentSales.length === 0) {
    return { 
      type: "text", 
      text: `No transactions found for ${formatTimeRange(query.timeRange)}.` 
    };
  }

  const rows = recentSales.map(t => 
    `#${t.id}: ${formatCurrency(t.total)} - ${format(new Date(t.timestamp), "MMM d, HH:mm")}`
  ).join("\n");

  return {
    type: "text",
    text: `Here are the last ${recentSales.length} transactions:\n\n${rows}`,
    data: recentSales
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
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const total = sales.reduce((sum, t) => sum + t.total, 0);
  const count = sales.length;
  
  return {
    type: "text",
    text: `Total revenue for **${formatTimeRange(query.timeRange)}** is **${formatCurrency(total)}** across ${count} transactions.`,
    data: { value: total, count },
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
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  sales.forEach(t => {
    t.items.forEach(item => {
      const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice;
      itemMap.set(item.name, existing);
    });
  });

  const items = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, query.limit || 5);

  if (items.length === 0) {
    return { type: "text", text: `No items sold during ${formatTimeRange(query.timeRange)}.` };
  }

  const list = items.map((i, idx) => `${idx + 1}. **${i.name}**: ${i.quantity} sold (${formatCurrency(i.revenue)})`).join("\n");

  return {
    type: "text",
    text: `**Top Items (${formatTimeRange(query.timeRange)}):**\n\n${list}`,
    data: items,
    timeRange: query.timeRange
  };
}

async function handleBottomItems(query: ParsedQuery): Promise<QueryResult> {
  const sales = await db.getSales(query.timeRange.startDate, query.timeRange.endDate);
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  sales.forEach(t => {
    t.items.forEach(item => {
      const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice;
      itemMap.set(item.name, existing);
    });
  });

  // Sort ascending (lowest first) instead of descending
  const items = Array.from(itemMap.values())
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, query.limit || 5);

  if (items.length === 0) {
    return { type: "text", text: `No items sold during ${formatTimeRange(query.timeRange)}.` };
  }

  const list = items.map((i, idx) => `${idx + 1}. **${i.name}**: ${i.quantity} sold (${formatCurrency(i.revenue)})`).join("\n");

  return {
    type: "text",
    text: `**Slowest Moving Items (${formatTimeRange(query.timeRange)}):**\n\n${list}`,
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