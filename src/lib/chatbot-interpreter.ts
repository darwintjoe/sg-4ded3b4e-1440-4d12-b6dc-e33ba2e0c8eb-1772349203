import { db } from "@/lib/db";
import { ParsedQuery } from "@/lib/chatbot-parser";
import { Transaction, DailyItemSales, DailyPaymentSales, MonthlyItemSales, Item, Employee, Attendance } from "@/types";

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  chartType?: "bar" | "line" | "pie" | "table" | "card" | "heatmap";
  responseText?: string;
}

/**
 * Execute parsed query against database
 */
export async function executeQuery(query: ParsedQuery): Promise<QueryResult> {
  try {
    switch (query.intent) {
      case "revenue":
        return await getRevenue(query);
      case "top_items":
        return await getTopItems(query);
      case "item_performance":
        return await getItemPerformance(query);
      case "category_analysis":
        return await getCategoryAnalysis(query);
      case "payment_methods":
        return await getPaymentMethods(query);
      case "employee_performance":
        return await getEmployeePerformance(query);
      case "attendance":
        return await getAttendance(query);
      case "peak_hours":
        return await getPeakHours(query);
      case "trend_analysis":
        return await getTrendAnalysis(query);
      case "transaction_count":
        return await getTransactionCount(query);
      default:
        return {
          success: false,
          error: "Intent not recognized"
        };
    }
  } catch (error) {
    console.error("Query execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get revenue data
 */
async function getRevenue(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);

  let totalRevenue = 0;
  let transactionCount = 0;

  if (useMonthly) {
    const monthlySales = await db.getAll<any>("monthlySalesSummary");
    const yearMonth = startDate.substring(0, 7); // YYYY-MM
    const monthData = monthlySales.find(m => m.yearMonth === yearMonth);
    
    if (monthData) {
      totalRevenue = monthData.totalRevenue;
      transactionCount = monthData.totalReceipts;
    }
  } else {
    const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
    const filtered = dailyPayments.filter(
      p => p.businessDate >= startDate && p.businessDate <= endDate
    );

    totalRevenue = filtered.reduce((sum, p) => sum + p.totalAmount, 0);
    transactionCount = filtered.reduce((sum, p) => sum + p.transactionCount, 0);
  }

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  return {
    success: true,
    chartType: "card",
    data: {
      value: totalRevenue,
      label: "Total Revenue",
      transactions: transactionCount
    },
    responseText: `💰 **Revenue ${timeLabel}**\n\n` +
      `**Total:** ${formatCurrency(totalRevenue)}\n` +
      `**Transactions:** ${transactionCount}\n` +
      `**Average per transaction:** ${formatCurrency(transactionCount > 0 ? totalRevenue / transactionCount : 0)}`
  };
}

/**
 * Get top selling items
 */
async function getTopItems(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);
  const limit = query.limit || 10;

  let itemSales: Array<{ itemId: number; itemName: string; sku: string; quantity: number; revenue: number }> = [];

  if (useMonthly) {
    const yearMonth = startDate.substring(0, 7);
    const monthlySales = await db.getAll<MonthlyItemSales>("monthlyItemSales");
    const filtered = monthlySales.filter(m => m.yearMonth === yearMonth);
    
    itemSales = filtered.map(m => ({
      itemId: m.itemId,
      itemName: m.itemName,
      sku: m.sku,
      quantity: m.totalQuantity,
      revenue: m.totalRevenue
    }));
  } else {
    const dailySales = await db.getAll<DailyItemSales>("dailyItemSales");
    const filtered = dailySales.filter(
      s => s.businessDate >= startDate && s.businessDate <= endDate
    );

    const aggregated = new Map<number, { itemName: string; sku: string; quantity: number; revenue: number }>();
    
    filtered.forEach(sale => {
      const existing = aggregated.get(sale.itemId) || { 
        itemName: sale.itemName, 
        sku: sale.sku, 
        quantity: 0, 
        revenue: 0 
      };
      existing.quantity += sale.totalQuantity;
      existing.revenue += sale.totalRevenue;
      aggregated.set(sale.itemId, existing);
    });

    itemSales = Array.from(aggregated.entries()).map(([itemId, data]) => ({
      itemId,
      ...data
    }));
  }

  // Sort by quantity and take top N
  itemSales.sort((a, b) => b.quantity - a.quantity);
  const topItems = itemSales.slice(0, limit);

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  let responseText = `📦 **Top ${limit} Items ${timeLabel}**\n\n`;
  
  topItems.forEach((item, index) => {
    responseText += `**${index + 1}. ${item.itemName}** (${item.sku})\n`;
    responseText += `   Sold: ${item.quantity} units | Revenue: ${formatCurrency(item.revenue)}\n\n`;
  });

  return {
    success: true,
    chartType: "bar",
    data: topItems.map(item => ({
      name: item.itemName,
      value: item.quantity,
      revenue: item.revenue
    })),
    responseText
  };
}

/**
 * Get specific item performance
 */
async function getItemPerformance(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);
  
  if (!query.entity) {
    return {
      success: false,
      error: "Please specify an item name"
    };
  }

  // Find item by name (case-insensitive search)
  const items = await db.getAll<Item>("items");
  const item = items.find(i => 
    i.name.toLowerCase().includes(query.entity!.toLowerCase()) ||
    i.sku.toLowerCase().includes(query.entity!.toLowerCase())
  );

  if (!item || !item.id) {
    return {
      success: false,
      error: `Item "${query.entity}" not found`
    };
  }

  let totalQuantity = 0;
  let totalRevenue = 0;
  let transactionCount = 0;

  if (useMonthly) {
    const yearMonth = startDate.substring(0, 7);
    const monthlySales = await db.getAll<MonthlyItemSales>("monthlyItemSales");
    const itemData = monthlySales.find(m => m.yearMonth === yearMonth && m.itemId === item.id);
    
    if (itemData) {
      totalQuantity = itemData.totalQuantity;
      totalRevenue = itemData.totalRevenue;
      transactionCount = itemData.transactionCount;
    }
  } else {
    const dailySales = await db.getAll<DailyItemSales>("dailyItemSales");
    const filtered = dailySales.filter(
      s => s.itemId === item.id && s.businessDate >= startDate && s.businessDate <= endDate
    );

    totalQuantity = filtered.reduce((sum, s) => sum + s.totalQuantity, 0);
    totalRevenue = filtered.reduce((sum, s) => sum + s.totalRevenue, 0);
    transactionCount = filtered.reduce((sum, s) => sum + s.transactionCount, 0);
  }

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);
  const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  return {
    success: true,
    chartType: "card",
    data: {
      itemName: item.name,
      quantity: totalQuantity,
      revenue: totalRevenue,
      transactions: transactionCount
    },
    responseText: `📊 **${item.name} Performance ${timeLabel}**\n\n` +
      `**Units Sold:** ${totalQuantity}\n` +
      `**Revenue:** ${formatCurrency(totalRevenue)}\n` +
      `**Transactions:** ${transactionCount}\n` +
      `**Average Price:** ${formatCurrency(avgPrice)}`
  };
}

/**
 * Get category analysis
 */
async function getCategoryAnalysis(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);

  // Get all items to map categories
  const items = await db.getAll<Item>("items");
  const categoryMap = new Map<string, { quantity: number; revenue: number }>();

  if (useMonthly) {
    const yearMonth = startDate.substring(0, 7);
    const monthlySales = await db.getAll<MonthlyItemSales>("monthlyItemSales");
    const filtered = monthlySales.filter(m => m.yearMonth === yearMonth);
    
    filtered.forEach(sale => {
      const item = items.find(i => i.id === sale.itemId);
      if (item) {
        const category = item.category || "Uncategorized";
        const existing = categoryMap.get(category) || { quantity: 0, revenue: 0 };
        existing.quantity += sale.totalQuantity;
        existing.revenue += sale.totalRevenue;
        categoryMap.set(category, existing);
      }
    });
  } else {
    const dailySales = await db.getAll<DailyItemSales>("dailyItemSales");
    const filtered = dailySales.filter(
      s => s.businessDate >= startDate && s.businessDate <= endDate
    );

    filtered.forEach(sale => {
      const item = items.find(i => i.id === sale.itemId);
      if (item) {
        const category = item.category || "Uncategorized";
        const existing = categoryMap.get(category) || { quantity: 0, revenue: 0 };
        existing.quantity += sale.totalQuantity;
        existing.revenue += sale.totalRevenue;
        categoryMap.set(category, existing);
      }
    });
  }

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      quantity: data.quantity,
      revenue: data.revenue
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  let responseText = `🏷️ **Category Analysis ${timeLabel}**\n\n`;
  
  categoryData.forEach((cat, index) => {
    responseText += `**${index + 1}. ${cat.category}**\n`;
    responseText += `   Units: ${cat.quantity} | Revenue: ${formatCurrency(cat.revenue)}\n\n`;
  });

  return {
    success: true,
    chartType: "pie",
    data: categoryData.map(cat => ({
      name: cat.category,
      value: cat.revenue
    })),
    responseText
  };
}

/**
 * Get payment methods breakdown
 */
async function getPaymentMethods(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);

  const paymentBreakdown = new Map<string, { amount: number; count: number }>();

  if (useMonthly) {
    const yearMonth = startDate.substring(0, 7);
    const monthlyPayments = await db.getAll<any>("monthlyPaymentSales");
    const filtered = monthlyPayments.filter(m => m.yearMonth === yearMonth);
    
    filtered.forEach(payment => {
      const method = formatPaymentMethod(payment.method);
      const existing = paymentBreakdown.get(method) || { amount: 0, count: 0 };
      existing.amount += payment.totalAmount;
      existing.count += payment.transactionCount;
      paymentBreakdown.set(method, existing);
    });
  } else {
    const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
    const filtered = dailyPayments.filter(
      p => p.businessDate >= startDate && p.businessDate <= endDate
    );

    filtered.forEach(payment => {
      const method = formatPaymentMethod(payment.method);
      const existing = paymentBreakdown.get(method) || { amount: 0, count: 0 };
      existing.amount += payment.totalAmount;
      existing.count += payment.transactionCount;
      paymentBreakdown.set(method, existing);
    });
  }

  const paymentData = Array.from(paymentBreakdown.entries())
    .map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count
    }))
    .sort((a, b) => b.amount - a.amount);

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);
  const totalAmount = paymentData.reduce((sum, p) => sum + p.amount, 0);

  let responseText = `💳 **Payment Methods ${timeLabel}**\n\n`;
  
  paymentData.forEach((payment, index) => {
    const percentage = totalAmount > 0 ? ((payment.amount / totalAmount) * 100).toFixed(1) : "0";
    responseText += `**${index + 1}. ${payment.method}**\n`;
    responseText += `   Amount: ${formatCurrency(payment.amount)} (${percentage}%)\n`;
    responseText += `   Transactions: ${payment.count}\n\n`;
  });

  return {
    success: true,
    chartType: "pie",
    data: paymentData.map(p => ({
      name: p.method,
      value: p.amount
    })),
    responseText
  };
}

/**
 * Get employee performance
 */
async function getEmployeePerformance(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  
  // Get transactions and aggregate by cashier
  const transactions = await db.getAll<Transaction>("transactions");
  const filtered = transactions.filter(
    t => t.businessDate >= startDate && t.businessDate <= endDate
  );

  const employeeMap = new Map<number, { name: string; revenue: number; count: number }>();

  filtered.forEach(transaction => {
    const existing = employeeMap.get(transaction.cashierId) || { 
      name: transaction.cashierName, 
      revenue: 0, 
      count: 0 
    };
    existing.revenue += transaction.total;
    existing.count += 1;
    employeeMap.set(transaction.cashierId, existing);
  });

  const employeeData = Array.from(employeeMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      revenue: data.revenue,
      transactions: data.count,
      avgTransaction: data.count > 0 ? data.revenue / data.count : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  let responseText = `👥 **Employee Performance ${timeLabel}**\n\n`;
  
  employeeData.forEach((emp, index) => {
    responseText += `**${index + 1}. ${emp.name}**\n`;
    responseText += `   Revenue: ${formatCurrency(emp.revenue)}\n`;
    responseText += `   Transactions: ${emp.transactions}\n`;
    responseText += `   Avg/Transaction: ${formatCurrency(emp.avgTransaction)}\n\n`;
  });

  return {
    success: true,
    chartType: "bar",
    data: employeeData.map(emp => ({
      name: emp.name,
      value: emp.revenue
    })),
    responseText
  };
}

/**
 * Get attendance data
 */
async function getAttendance(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  
  const attendance = await db.getAll<Attendance>("attendance");
  const filtered = attendance.filter(
    a => a.date >= startDate && a.date <= endDate
  );

  const employeeMap = new Map<number, { name: string; hours: number; days: number }>();

  filtered.forEach(record => {
    if (record.clockOut) {
      const hours = (record.clockOut - record.clockIn) / (1000 * 60 * 60);
      const existing = employeeMap.get(record.employeeId) || { 
        name: record.employeeName, 
        hours: 0, 
        days: 0 
      };
      existing.hours += hours;
      existing.days += 1;
      employeeMap.set(record.employeeId, existing);
    }
  });

  const attendanceData = Array.from(employeeMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      totalHours: data.hours,
      daysWorked: data.days,
      avgHours: data.days > 0 ? data.hours / data.days : 0
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const timeLabel = getTimeLabel(query.timeRange);

  let responseText = `⏰ **Attendance Summary ${timeLabel}**\n\n`;
  
  attendanceData.forEach((att, index) => {
    responseText += `**${index + 1}. ${att.name}**\n`;
    responseText += `   Total Hours: ${att.totalHours.toFixed(1)}h\n`;
    responseText += `   Days Worked: ${att.daysWorked}\n`;
    responseText += `   Avg Hours/Day: ${att.avgHours.toFixed(1)}h\n\n`;
  });

  return {
    success: true,
    chartType: "bar",
    data: attendanceData.map(att => ({
      name: att.name,
      value: att.totalHours
    })),
    responseText
  };
}

/**
 * Get peak hours analysis
 */
async function getPeakHours(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  
  const transactions = await db.getAll<Transaction>("transactions");
  const filtered = transactions.filter(
    t => t.businessDate >= startDate && t.businessDate <= endDate
  );

  const hourMap = new Map<number, { revenue: number; count: number }>();

  filtered.forEach(transaction => {
    const hour = new Date(transaction.timestamp).getHours();
    const existing = hourMap.get(hour) || { revenue: 0, count: 0 };
    existing.revenue += transaction.total;
    existing.count += 1;
    hourMap.set(hour, existing);
  });

  const hourData = Array.from(hourMap.entries())
    .map(([hour, data]) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      revenue: data.revenue,
      transactions: data.count
    }))
    .sort((a, b) => b.transactions - a.transactions);

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  let responseText = `🕐 **Peak Hours ${timeLabel}**\n\n`;
  
  hourData.slice(0, 10).forEach((hour, index) => {
    responseText += `**${index + 1}. ${hour.hour}**\n`;
    responseText += `   Transactions: ${hour.transactions}\n`;
    responseText += `   Revenue: ${formatCurrency(hour.revenue)}\n\n`;
  });

  return {
    success: true,
    chartType: "bar",
    data: hourData.map(h => ({
      name: h.hour,
      value: h.transactions
    })),
    responseText
  };
}

/**
 * Get trend analysis
 */
async function getTrendAnalysis(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  
  const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
  const filtered = dailyPayments.filter(
    p => p.businessDate >= startDate && p.businessDate <= endDate
  );

  // Aggregate by date
  const dateMap = new Map<string, { revenue: number; count: number }>();

  filtered.forEach(payment => {
    const existing = dateMap.get(payment.businessDate) || { revenue: 0, count: 0 };
    existing.revenue += payment.totalAmount;
    existing.count += payment.transactionCount;
    dateMap.set(payment.businessDate, existing);
  });

  const trendData = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      transactions: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);

  const totalRevenue = trendData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = trendData.length > 0 ? totalRevenue / trendData.length : 0;

  let responseText = `📈 **Sales Trend ${timeLabel}**\n\n`;
  responseText += `**Total Revenue:** ${formatCurrency(totalRevenue)}\n`;
  responseText += `**Days:** ${trendData.length}\n`;
  responseText += `**Avg Daily Revenue:** ${formatCurrency(avgDailyRevenue)}\n\n`;
  responseText += `**Daily Breakdown:**\n`;
  
  trendData.slice(-7).forEach(day => {
    responseText += `${day.date}: ${formatCurrency(day.revenue)} (${day.transactions} txn)\n`;
  });

  return {
    success: true,
    chartType: "line",
    data: trendData.map(d => ({
      name: d.date,
      value: d.revenue
    })),
    responseText
  };
}

/**
 * Get transaction count
 */
async function getTransactionCount(query: ParsedQuery): Promise<QueryResult> {
  const { startDate, endDate } = getDateRange(query.timeRange);
  const useMonthly = shouldUseMonthly(startDate);

  let totalTransactions = 0;
  let totalRevenue = 0;

  if (useMonthly) {
    const monthlySales = await db.getAll<any>("monthlySalesSummary");
    const yearMonth = startDate.substring(0, 7);
    const monthData = monthlySales.find(m => m.yearMonth === yearMonth);
    
    if (monthData) {
      totalTransactions = monthData.totalReceipts;
      totalRevenue = monthData.totalRevenue;
    }
  } else {
    const dailyPayments = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
    const filtered = dailyPayments.filter(
      p => p.businessDate >= startDate && p.businessDate <= endDate
    );

    totalTransactions = filtered.reduce((sum, p) => sum + p.transactionCount, 0);
    totalRevenue = filtered.reduce((sum, p) => sum + p.totalAmount, 0);
  }

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
  const timeLabel = getTimeLabel(query.timeRange);
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    success: true,
    chartType: "card",
    data: {
      count: totalTransactions,
      revenue: totalRevenue,
      avgValue: avgTransactionValue
    },
    responseText: `🔢 **Transactions ${timeLabel}**\n\n` +
      `**Total Transactions:** ${totalTransactions}\n` +
      `**Total Revenue:** ${formatCurrency(totalRevenue)}\n` +
      `**Average Value:** ${formatCurrency(avgTransactionValue)}`
  };
}

/**
 * Helper: Get date range based on time range
 */
function getDateRange(timeRange: string): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];
  
  let startDate = endDate;

  switch (timeRange) {
    case "today":
      startDate = endDate;
      break;
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().split("T")[0];
      endDate = startDate;
      break;
    case "this_week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = weekStart.toISOString().split("T")[0];
      break;
    case "last_week":
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      startDate = lastWeekStart.toISOString().split("T")[0];
      endDate = lastWeekEnd.toISOString().split("T")[0];
      break;
    case "this_month":
      startDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-01`;
      break;
    case "last_month":
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = lastMonth.toISOString().split("T")[0];
      endDate = lastMonthEnd.toISOString().split("T")[0];
      break;
    case "last_30_days":
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split("T")[0];
      break;
    case "last_60_days":
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(today.getDate() - 60);
      startDate = sixtyDaysAgo.toISOString().split("T")[0];
      break;
    default:
      startDate = endDate;
  }

  return { startDate, endDate };
}

/**
 * Helper: Check if we should use monthly summaries (older than 60 days)
 */
function shouldUseMonthly(startDate: string): boolean {
  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 60);
  const cutoffDate = sixtyDaysAgo.toISOString().split("T")[0];

  return startDate < cutoffDate;
}

/**
 * Helper: Get time label for display
 */
function getTimeLabel(timeRange: string): string {
  const labels: Record<string, string> = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    last_week: "Last Week",
    this_month: "This Month",
    last_month: "Last Month",
    last_30_days: "Last 30 Days",
    last_60_days: "Last 60 Days"
  };

  return labels[timeRange] || timeRange;
}

/**
 * Helper: Format payment method name
 */
function formatPaymentMethod(method: string): string {
  const formats: Record<string, string> = {
    "cash": "Cash",
    "qris-static": "QRIS Static",
    "qris-dynamic": "QRIS Dynamic",
    "card": "Card",
    "voucher": "Voucher",
    "transfer": "Bank Transfer"
  };

  return formats[method] || method;
}