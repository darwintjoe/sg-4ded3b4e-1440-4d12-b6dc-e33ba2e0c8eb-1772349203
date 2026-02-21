import { db } from "./db";
import type { ParsedQuery, QueryResult, TimeRange, Transaction, CartItem } from "@/types";

function getDateRange(timeRange: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeRange.type) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek,
        end: now,
      };
    }

    case "last_week": {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return {
        start: startOfLastWeek,
        end: endOfLastWeek,
      };
    }

    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfMonth,
        end: now,
      };
    }

    case "last_month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return {
        start: startOfLastMonth,
        end: endOfLastMonth,
      };
    }

    case "last_n_days": {
      const days = timeRange.days || 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - days);
      return {
        start: startDate,
        end: now,
      };
    }

    case "all_time":
    default:
      return {
        start: new Date(0),
        end: now,
      };
  }
}

function formatTimeRangeLabel(timeRange: TimeRange): string {
  switch (timeRange.type) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "this_week":
      return "This Week";
    case "last_week":
      return "Last Week";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "last_n_days":
      return `Last ${timeRange.days} Days`;
    case "all_time":
      return "All Time";
    default:
      return "Unknown Period";
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPercentChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  return `${arrow} ${sign}${change.toFixed(1)}%`;
}

// Helper to extract payment method from transaction
function getPaymentMethod(transaction: Transaction): string {
  if (transaction.payments && transaction.payments.length > 0) {
    return transaction.payments[0].method;
  }
  return "Unknown";
}

async function handleCompareIntent(query: ParsedQuery): Promise<QueryResult> {
  if (!query.compareTimeRange) {
    return {
      success: false,
      message: "❌ **Error:** Comparison requires two time periods",
    };
  }

  const primaryRange = getDateRange(query.timeRange);
  const compareRange = getDateRange(query.compareTimeRange);
  const primaryLabel = formatTimeRangeLabel(query.timeRange);
  const compareLabel = formatTimeRangeLabel(query.compareTimeRange);
  
  // Use entity as sub-intent, defaulting to revenue if not specified or unknown
  const subIntent = (query.entity || "revenue") as string;

  try {
    switch (subIntent) {
      case "transactions": {
        const [primarySales, compareSales] = await Promise.all([
          db.getSales(primaryRange.start, primaryRange.end),
          db.getSales(compareRange.start, compareRange.end),
        ]);

        const primaryCount = primarySales.length;
        const compareCount = compareSales.length;
        const difference = primaryCount - compareCount;
        const percentChange = compareCount > 0 ? ((difference / compareCount) * 100) : 0;

        return {
          success: true,
          message: `📊 **Transaction Count Comparison**\n\n**${primaryLabel}:** ${primaryCount} transactions\n**${compareLabel}:** ${compareCount} transactions\n\n**Difference:** ${difference > 0 ? "+" : ""}${difference} transactions ${formatPercentChange(percentChange)}`,
          responseText: `Comparing ${primaryLabel} vs ${compareLabel}, transaction count changed by ${difference} (${percentChange.toFixed(1)}%).`
        };
      }

      case "top_items": {
        const [primarySales, compareSales] = await Promise.all([
          db.getSales(primaryRange.start, primaryRange.end),
          db.getSales(compareRange.start, compareRange.end),
        ]);

        const primaryItemSales = new Map<number, { name: string; quantity: number; revenue: number }>();
        const compareItemSales = new Map<number, { name: string; quantity: number; revenue: number }>();

        primarySales.forEach(sale => {
          sale.items.forEach(item => {
            const existing = primaryItemSales.get(item.itemId) || { name: item.name, quantity: 0, revenue: 0 };
            primaryItemSales.set(item.itemId, {
              name: item.name,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.basePrice * item.quantity),
            });
          });
        });

        compareSales.forEach(sale => {
          sale.items.forEach(item => {
            const existing = compareItemSales.get(item.itemId) || { name: item.name, quantity: 0, revenue: 0 };
            compareItemSales.set(item.itemId, {
              name: item.name,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.basePrice * item.quantity),
            });
          });
        });

        const primaryTop = Array.from(primaryItemSales.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        const compareTop = Array.from(compareItemSales.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        let message = `📊 **Top Selling Items Comparison**\n\n**${primaryLabel}:**\n`;
        primaryTop.forEach((item, i) => {
          message += `${i + 1}. ${item.name} - ${item.quantity} units (${formatCurrency(item.revenue)})\n`;
        });

        message += `\n**${compareLabel}:**\n`;
        compareTop.forEach((item, i) => {
          message += `${i + 1}. ${item.name} - ${item.quantity} units (${formatCurrency(item.revenue)})\n`;
        });

        return { 
          success: true, 
          message,
          responseText: `Here is the comparison of top items between ${primaryLabel} and ${compareLabel}.`
        };
      }

      case "payment_methods": {
        const [primarySales, compareSales] = await Promise.all([
          db.getSales(primaryRange.start, primaryRange.end),
          db.getSales(compareRange.start, compareRange.end),
        ]);

        const primaryPayments = new Map<string, number>();
        const comparePayments = new Map<string, number>();

        primarySales.forEach(sale => {
          const method = getPaymentMethod(sale);
          const current = primaryPayments.get(method) || 0;
          primaryPayments.set(method, current + sale.total);
        });

        compareSales.forEach(sale => {
          const method = getPaymentMethod(sale);
          const current = comparePayments.get(method) || 0;
          comparePayments.set(method, current + sale.total);
        });

        let message = `📊 **Payment Methods Comparison**\n\n**${primaryLabel}:**\n`;
        Array.from(primaryPayments.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([method, amount]) => {
            message += `${method}: ${formatCurrency(amount)}\n`;
          });

        message += `\n**${compareLabel}:**\n`;
        Array.from(comparePayments.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([method, amount]) => {
            message += `${method}: ${formatCurrency(amount)}\n`;
          });

        return { 
          success: true, 
          message,
          responseText: `Here is the payment method breakdown for ${primaryLabel} vs ${compareLabel}.`
        };
      }

      case "employee_sales": {
        const [primarySales, compareSales] = await Promise.all([
          db.getSales(primaryRange.start, primaryRange.end),
          db.getSales(compareRange.start, compareRange.end),
        ]);

        const primaryEmpSales = new Map<number, { name: string; total: number; count: number }>();
        const compareEmpSales = new Map<number, { name: string; total: number; count: number }>();

        primarySales.forEach(sale => {
          const existing = primaryEmpSales.get(sale.cashierId) || { name: sale.cashierName || "Unknown", total: 0, count: 0 };
          primaryEmpSales.set(sale.cashierId, {
            name: existing.name,
            total: existing.total + sale.total,
            count: existing.count + 1,
          });
        });

        compareSales.forEach(sale => {
          const existing = compareEmpSales.get(sale.cashierId) || { name: sale.cashierName || "Unknown", total: 0, count: 0 };
          compareEmpSales.set(sale.cashierId, {
            name: existing.name,
            total: existing.total + sale.total,
            count: existing.count + 1,
          });
        });

        let message = `📊 **Employee Sales Comparison**\n\n**${primaryLabel}:**\n`;
        Array.from(primaryEmpSales.values())
          .sort((a, b) => b.total - a.total)
          .forEach(emp => {
            message += `${emp.name}: ${formatCurrency(emp.total)} (${emp.count} sales)\n`;
          });

        message += `\n**${compareLabel}:**\n`;
        Array.from(compareEmpSales.values())
          .sort((a, b) => b.total - a.total)
          .forEach(emp => {
            message += `${emp.name}: ${formatCurrency(emp.total)} (${emp.count} sales)\n`;
          });

        return { 
          success: true, 
          message,
          responseText: `Employee performance comparison between ${primaryLabel} and ${compareLabel}.`
        };
      }

      case "revenue":
      default: {
        const [primarySales, compareSales] = await Promise.all([
          db.getSales(primaryRange.start, primaryRange.end),
          db.getSales(compareRange.start, compareRange.end),
        ]);

        const primaryRevenue = primarySales.reduce((sum, sale) => sum + sale.total, 0);
        const compareRevenue = compareSales.reduce((sum, sale) => sum + sale.total, 0);
        const difference = primaryRevenue - compareRevenue;
        const percentChange = compareRevenue > 0 ? ((difference / compareRevenue) * 100) : 0;

        return {
          success: true,
          message: `📊 **Revenue Comparison**\n\n**${primaryLabel}:** ${formatCurrency(primaryRevenue)}\n**${compareLabel}:** ${formatCurrency(compareRevenue)}\n\n**Difference:** ${difference > 0 ? "+" : ""}${formatCurrency(difference)} ${formatPercentChange(percentChange)}`,
          responseText: `Revenue changed by ${formatCurrency(Math.abs(difference))} (${percentChange.toFixed(1)}%) between ${primaryLabel} and ${compareLabel}.`
        };
      }
    }
  } catch (error) {
    console.error("Comparison query error:", error);
    return {
      success: false,
      message: "❌ **Error:** Failed to execute comparison query",
      error: String(error)
    };
  }
}

export async function executeQuery(query: ParsedQuery): Promise<QueryResult> {
  try {
    switch (query.intent) {
      case "compare":
        return await handleCompareIntent(query);

      case "revenue": {
        const dateRange = getDateRange(query.timeRange);
        const sales = await db.getSales(dateRange.start, dateRange.end);
        const total = sales.reduce((sum, sale) => sum + sale.total, 0);
        const timeLabel = formatTimeRangeLabel(query.timeRange);

        return {
          success: true,
          message: `💰 **Total Revenue (${timeLabel}):** ${formatCurrency(total)}\n\nBased on ${sales.length} transactions`,
          responseText: `The total revenue for ${timeLabel} is ${formatCurrency(total)}.`
        };
      }

      case "transactions": {
        const dateRange = getDateRange(query.timeRange);
        const sales = await db.getSales(dateRange.start, dateRange.end);
        const timeLabel = formatTimeRangeLabel(query.timeRange);

        return {
          success: true,
          message: `📊 **Transactions (${timeLabel}):** ${sales.length}\n\nTotal Revenue: ${formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}`,
          responseText: `There were ${sales.length} transactions during ${timeLabel}.`
        };
      }

      case "top_items": {
        const dateRange = getDateRange(query.timeRange);
        const sales = await db.getSales(dateRange.start, dateRange.end);
        const timeLabel = formatTimeRangeLabel(query.timeRange);
        const itemSales = new Map<number, { name: string; quantity: number; revenue: number }>();

        sales.forEach((sale) => {
          sale.items.forEach((item) => {
            const existing = itemSales.get(item.itemId) || {
              name: item.name,
              quantity: 0,
              revenue: 0,
            };
            itemSales.set(item.itemId, {
              name: item.name,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + item.basePrice * item.quantity,
            });
          });
        });

        const topItems = Array.from(itemSales.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, query.limit || 5);

        if (topItems.length === 0) {
          return {
            success: true,
            message: `📦 **Top Selling Items (${timeLabel}):**\n\nNo sales data available for this period.`,
            responseText: `I couldn't find any sales data for ${timeLabel}.`
          };
        }

        let message = `📦 **Top Selling Items (${timeLabel}):**\n\n`;
        topItems.forEach((item, index) => {
          message += `${index + 1}. **${item.name}** - ${item.quantity} units sold (${formatCurrency(item.revenue)})\n`;
        });

        return {
          success: true,
          message,
          responseText: `Here are the top selling items for ${timeLabel}.`
        };
      }

      case "low_stock": {
        const items = await db.getItems();
        const lowStockItems = items
          .filter((item) => item.stock !== undefined && item.stock <= (item.lowStockThreshold || 10))
          .sort((a, b) => (a.stock || 0) - (b.stock || 0))
          .slice(0, query.limit || 10);

        if (lowStockItems.length === 0) {
          return {
            success: true,
            message: "✅ **Low Stock Items:** All items are well-stocked!",
            responseText: "All items are well-stocked."
          };
        }

        let message = "⚠️ **Low Stock Items:**\n\n";
        lowStockItems.forEach((item, index) => {
          message += `${index + 1}. **${item.name}** - ${item.stock} units remaining\n`;
        });

        return {
          success: true,
          message,
          responseText: "Here are the items running low on stock."
        };
      }

      case "employee_sales": {
        const dateRange = getDateRange(query.timeRange);
        const sales = await db.getSales(dateRange.start, dateRange.end);
        const timeLabel = formatTimeRangeLabel(query.timeRange);
        const employeeSales = new Map<number, { name: string; total: number; count: number }>();

        sales.forEach((sale) => {
          const existing = employeeSales.get(sale.cashierId) || {
            name: sale.cashierName || "Unknown",
            total: 0,
            count: 0,
          };
          employeeSales.set(sale.cashierId, {
            name: existing.name,
            total: existing.total + sale.total,
            count: existing.count + 1,
          });
        });

        const topEmployees = Array.from(employeeSales.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, query.limit || 5);

        if (topEmployees.length === 0) {
          return {
            success: true,
            message: `👥 **Employee Sales (${timeLabel}):**\n\nNo sales data available for this period.`,
            responseText: `No employee sales data found for ${timeLabel}.`
          };
        }

        let message = `👥 **Employee Sales (${timeLabel}):**\n\n`;
        topEmployees.forEach((emp, index) => {
          message += `${index + 1}. **${emp.name}** - ${formatCurrency(emp.total)} (${emp.count} transactions)\n`;
        });

        return {
          success: true,
          message,
          responseText: `Here is the employee sales performance for ${timeLabel}.`
        };
      }

      case "attendance": {
        const dateRange = getDateRange(query.timeRange);
        const attendance = await db.getAttendance(dateRange.start, dateRange.end);
        const timeLabel = formatTimeRangeLabel(query.timeRange);

        if (attendance.length === 0) {
          return {
            success: true,
            message: `📅 **Attendance (${timeLabel}):**\n\nNo attendance records for this period.`,
            responseText: `No attendance records found for ${timeLabel}.`
          };
        }

        let message = `📅 **Attendance (${timeLabel}):**\n\n`;
        attendance.forEach((record) => {
          const clockIn = new Date(record.clockIn).toLocaleTimeString();
          const clockOut = record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : "Still working";
          message += `**${record.employeeName}** - In: ${clockIn}, Out: ${clockOut}\n`;
        });

        return {
          success: true,
          message,
          responseText: `Here is the attendance report for ${timeLabel}.`
        };
      }

      case "payment_methods": {
        const dateRange = getDateRange(query.timeRange);
        const sales = await db.getSales(dateRange.start, dateRange.end);
        const timeLabel = formatTimeRangeLabel(query.timeRange);
        const paymentMethods = new Map<string, number>();

        sales.forEach((sale) => {
          const method = getPaymentMethod(sale);
          const current = paymentMethods.get(method) || 0;
          paymentMethods.set(method, current + sale.total);
        });

        if (paymentMethods.size === 0) {
          return {
            success: true,
            message: `💳 **Payment Methods (${timeLabel}):**\n\nNo payment data available for this period.`,
            responseText: `No payment data found for ${timeLabel}.`
          };
        }

        let message = `💳 **Payment Methods (${timeLabel}):**\n\n`;
        const sortedPayments = Array.from(paymentMethods.entries()).sort((a, b) => b[1] - a[1]);

        sortedPayments.forEach(([method, total]) => {
          const percentage = (total / sales.reduce((sum, s) => sum + s.total, 0)) * 100;
          message += `**${method}:** ${formatCurrency(total)} (${percentage.toFixed(1)}%)\n`;
        });

        return {
          success: true,
          message,
          responseText: `Here is the payment method breakdown for ${timeLabel}.`
        };
      }

      case "help": {
        return {
          success: true,
          message: `🤖 **AI Assistant Help**\n\n**Revenue & Sales:**\n- "What's the total revenue today?"\n- "Show me sales for last week"\n- "How much did we make this month?"\n\n**Comparisons:**\n- "Compare revenue this week vs last week"\n- "Compare best selling items January with December"\n- "Sales this month vs last month"\n\n**Items & Inventory:**\n- "Best selling items today"\n- "Top 10 items this month"\n- "Show me low stock items"\n\n**Employees:**\n- "Employee sales today"\n- "Who sold the most this week?"\n- "Show attendance for today"\n\n**Payments:**\n- "Payment breakdown for today"\n- "How do people pay this month?"\n\n**Time Periods:** today, yesterday, this week, last week, this month, last month, last 7 days, all time`,
          responseText: "Here is what I can do for you."
        };
      }

      case "polite_response": {
        return {
          success: true,
          message: "😊 You're welcome! Let me know if you need anything else!",
          responseText: "You're welcome!"
        };
      }

      case "out_of_context": {
        return {
          success: true,
          message: "🤔 I'm specialized in analyzing your sales data. Try asking about revenue, items, employees, or type 'help' for examples!",
          responseText: "I can only help with sales and business data."
        };
      }

      default:
        return {
          success: false,
          message: "❌ **Error:** Intent not recognized. Type 'help' to see what I can do!",
          responseText: "I didn't understand that. Try asking for 'help'."
        };
    }
  } catch (error) {
    console.error("Query execution error:", error);
    return {
      success: false,
      message: "❌ **Error:** Failed to execute query. Please try again.",
      error: String(error)
    };
  }
}