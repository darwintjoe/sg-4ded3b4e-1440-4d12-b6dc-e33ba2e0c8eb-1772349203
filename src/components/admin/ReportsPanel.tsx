import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { DailyItemSales, DailyPaymentSales, DailyAttendance, MonthlyItemSales, MonthlySalesSummary } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { Download, Printer, Table2, TrendingUp, TrendingDown, Minus, DollarSign, Receipt, Users, Clock } from "lucide-react";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { PieChart } from "@/components/charts/PieChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";

type SalesTimeRange = "mtd" | "lm" | "ytd" | "ly" | "5y";
type ItemsTimeRange = "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type AttendanceTimeRange = "mtd" | "ytd";
type ChartView = "bar" | "pie";
type SortBy = "quantity" | "revenue";

export function ReportsPanel() {
  const { language } = useApp();
  const locale = language === "id" ? "id-ID" : "en-US";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const t = {
    common: {
      cash: "Cash",
      qrisStatic: "QRIS Static",
      qrisDynamic: "QRIS Dynamic",
      voucher: "Voucher",
    },
    reports: {
      dailySalesData: "Daily Sales Data",
      monthlySalesData: "Monthly Sales Data",
      topItemsData: "Top Items Data",
      noData: "No data available for the selected period",
      date: "Date",
      month: "Month",
      revenue: "Revenue",
      receipts: "Receipts",
      total: "Total",
      items: "Items",
      itemName: "Item Name",
      quantity: "Quantity",
      transactions: "Transactions",
      avgPerTransaction: "Avg/Tx",
    }
  };

  // Sales state
  const [salesTimeRange, setSalesTimeRange] = useState<SalesTimeRange>("mtd");
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    totalReceipts: 0,
    avgTransaction: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]); // New state for table

  // Items state
  const [itemsTimeRange, setItemsTimeRange] = useState<ItemsTimeRange>("1m");
  const [itemTopN, setItemTopN] = useState<10 | 20>(10);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [sortBy, setSortBy] = useState<SortBy>("quantity");
  const [topItems, setTopItems] = useState<Array<{
    itemName: string;
    quantity: number;
    revenue: number;
  }>>([]);
  const [topItemsData, setTopItemsData] = useState<any[]>([]); // New state for table

  // Attendance state
  const [attendanceTimeRange, setAttendanceTimeRange] = useState<AttendanceTimeRange>("mtd");
  const [attendanceData, setAttendanceData] = useState<Array<{
    employeeName: string;
    totalHours: number;
    daysWorked: number;
    lateCount: number;
  }>>([]);

  // Helper to determine if we are in monthly view for rendering
  const isSalesMonthlyView = ["ytd", "ly", "5y"].includes(salesTimeRange);

  useEffect(() => {
    loadSalesReport();
  }, [salesTimeRange]);

  useEffect(() => {
    console.log("🔍 Items report triggered - Range:", itemsTimeRange, "TopN:", itemTopN, "Sort:", sortBy);
    loadItemsReport();
  }, [itemsTimeRange, itemTopN, sortBy]);

  useEffect(() => {
    loadAttendanceReport();
  }, [attendanceTimeRange]);

  // Debug: Check database on mount
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        console.log("🔍 DATABASE CHECK - Starting...");
        
        const allDailyItems = await db.getAll<DailyItemSales>("dailyItemSales");
        console.log("📦 Total dailyItemSales records:", allDailyItems.length);
        
        if (allDailyItems.length > 0) {
          console.log("📦 First record:", allDailyItems[0]);
          console.log("📦 First record keys:", Object.keys(allDailyItems[0]));
          console.log("📦 Has 'businessDate'?", "businessDate" in allDailyItems[0]);
          console.log("📦 Has 'date'?", "date" in allDailyItems[0]);
          
          // Show first 3 records
          console.log("📦 First 3 records:", allDailyItems.slice(0, 3));
        } else {
          console.log("❌ NO RECORDS in dailyItemSales!");
        }

        const allMonthlyItems = await db.getAll<MonthlyItemSales>("monthlyItemSales");
        console.log("📦 Total monthlyItemSales records:", allMonthlyItems.length);
        if (allMonthlyItems.length > 0) {
          console.log("📦 First monthly record:", allMonthlyItems[0]);
        }

      } catch (error) {
        console.error("❌ Database check error:", error);
      }
    };
    
    checkDatabase();
  }, []); // Run once on mount

  const getSalesDateRange = (): { startDate: string; endDate: string; useMonthly: boolean } => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (salesTimeRange === "mtd") {
      const monthStart = todayStr.substring(0, 8) + "01";
      return { startDate: monthStart, endDate: todayStr, useMonthly: false };
    } else if (salesTimeRange === "lm") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { startDate: thirtyDaysAgo.toISOString().split("T")[0], endDate: todayStr, useMonthly: false };
    } else if (salesTimeRange === "ytd") {
      const yearStart = todayStr.substring(0, 4) + "-01-01";
      return { startDate: yearStart, endDate: todayStr, useMonthly: true };
    } else if (salesTimeRange === "ly") {
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(today.getMonth() - 12);
      return { startDate: twelveMonthsAgo.toISOString().split("T")[0], endDate: todayStr, useMonthly: true };
    } else {
      // 5y
      const fiveYearsAgo = new Date(today);
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      return { startDate: fiveYearsAgo.toISOString().split("T")[0], endDate: todayStr, useMonthly: true };
    }
  };

  const getItemsDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    let startDate: Date;

    switch (itemsTimeRange) {
      case "1d":
        startDate = today;
        break;
      case "7d":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "1m":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3m":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "6m":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "1y":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case "3y":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 3);
        break;
      case "5y":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 5);
        break;
      default:
        startDate = today;
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    };
  };

  const loadSalesReport = async () => {
    try {
      const { startDate, endDate, useMonthly } = getSalesDateRange();

      if (useMonthly) {
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        
        const chartData = filtered.map(m => ({
          name: m.month,
          cash: m.cashAmount,
          qrisStatic: m.qrisStaticAmount,
          qrisDynamic: m.qrisDynamicAmount,
          voucher: m.voucherAmount
        }));
        setSalesChartData(chartData);
        
        // Populate table data for monthly view
        const tableData = filtered.map(m => ({
          date: m.month, // using date field for month string to reuse table column
          revenue: m.totalRevenue,
          receipts: m.totalReceipts,
          cash: m.cashAmount,
          qrisStatic: m.qrisStaticAmount,
          qrisDynamic: m.qrisDynamicAmount,
          voucher: m.voucherAmount
        })).sort((a, b) => b.date.localeCompare(a.date)); // Sort descending
        setSalesData(tableData);

        const totalRevenue = filtered.reduce((sum, m) => sum + m.totalRevenue, 0);
        const totalReceipts = filtered.reduce((sum, m) => sum + m.totalReceipts, 0);

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });
      } else {
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDate && d.businessDate <= endDate);
        
        const dateMap = new Map<string, { cash: number; qrisStatic: number; qrisDynamic: number; voucher: number; receipts: number }>();
        
        filtered.forEach(d => {
          const existing = dateMap.get(d.businessDate) || { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0, receipts: 0 };
          if (d.method === "cash") existing.cash += d.totalAmount;
          else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
          else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
          else if (d.method === "voucher") existing.voucher += d.totalAmount;
          
          existing.receipts += d.transactionCount; // Sum transactions for the day
          dateMap.set(d.businessDate, existing);
        });

        // Chart data
        const chartData = Array.from(dateMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, data]) => ({
            name: date.substring(5),
            ...data
          }));
        setSalesChartData(chartData);

        // Table data
        const tableData = Array.from(dateMap.entries())
          .map(([date, data]) => ({
            date,
            revenue: data.cash + data.qrisStatic + data.qrisDynamic + data.voucher,
            receipts: data.receipts,
            cash: data.cash,
            qrisStatic: data.qrisStatic,
            qrisDynamic: data.qrisDynamic,
            voucher: data.voucher
          }))
          .sort((a, b) => b.date.localeCompare(a.date)); // Sort descending
        setSalesData(tableData);

        let totalReceipts = 0;
        let totalRevenue = 0;

        filtered.forEach(payment => {
          totalRevenue += payment.totalAmount;
          totalReceipts += payment.transactionCount;
        });

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
    }
  };

  const loadItemsReport = async () => {
    try {
      console.log("📊 Starting loadItemsReport...");
      
      const { startDate, endDate } = getItemsDateRange();
      console.log("📅 Date range:", startDate, "to", endDate);
      
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const useMonthly = daysDiff > 31;
      console.log("⏱️ Days diff:", daysDiff, "Use monthly:", useMonthly);

      const itemMap = new Map<number, { name: string; quantity: number; revenue: number; transactions: number }>();

      if (useMonthly) {
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        console.log("📆 Monthly range:", startMonth, "to", endMonth);
        
        const allMonthly = await db.getAll<MonthlyItemSales>("monthlyItemSales");
        console.log("📦 Total monthly records in DB:", allMonthly.length);
        console.log("📦 Sample monthly record:", allMonthly[0]);
        
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        console.log("✅ Filtered monthly records:", filtered.length);
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });
      } else {
        console.log("📆 Daily range:", startDate, "to", endDate);
        
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        console.log("📦 Total daily records in DB:", allDaily.length);
        console.log("📦 Sample daily record:", allDaily[0]);
        
        const filtered = allDaily.filter(d => {
          const hasBusinessDate = d.businessDate >= startDate && d.businessDate <= endDate;
          const hasDateField = (d as any).date >= startDate && (d as any).date <= endDate;
          return hasBusinessDate || hasDateField;
        });
        console.log("✅ Filtered daily records:", filtered.length);
        
        if (filtered.length > 0) {
          console.log("📊 First filtered record:", filtered[0]);
        }
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });
      }

      console.log("🗺️ ItemMap size:", itemMap.size);
      
      // Sort by selected criteria
      const allItems = Array.from(itemMap.values());
      const sorted = allItems.sort((a, b) => 
        sortBy === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue
      );
      
      console.log("📊 Sorted items count:", sorted.length);
      
      const topNItems = sorted.slice(0, itemTopN);
      const others = sorted.slice(itemTopN);
      
      // For Chart
      const chartResult = topNItems.map(item => ({
        itemName: item.name,
        quantity: item.quantity,
        revenue: item.revenue
      }));
      
      if (others.length > 0) {
        chartResult.push({
          itemName: "Other Items",
          quantity: others.reduce((sum, item) => sum + item.quantity, 0),
          revenue: others.reduce((sum, item) => sum + item.revenue, 0)
        });
      }
      setTopItems(chartResult);

      // For Table (Detailed top items)
      const tableData = topNItems.map(item => ({
        name: item.name,
        value: item.quantity, // quantity
        revenue: item.revenue,
        transactionCount: item.transactions
      }));
      setTopItemsData(tableData);

    } catch (error) {
      console.error("❌ Error loading items report:", error);
    }
  };

  const loadAttendanceReport = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const startDate = attendanceTimeRange === "mtd" 
        ? today.substring(0, 8) + "01"
        : today.substring(0, 4) + "-01-01";

      const allDaily = await db.getAll<DailyAttendance>("dailyAttendance");
      const filtered = allDaily.filter(d => d.date >= startDate && d.date <= today);
      
      const employeeMap = new Map<number, { name: string; hours: number; days: number; late: number }>();
      
      filtered.forEach(record => {
        const existing = employeeMap.get(record.employeeId) || { 
          name: record.employeeName, 
          hours: 0, 
          days: 0, 
          late: 0 
        };
        existing.hours += record.hoursWorked;
        existing.days += 1;
        if (record.isLate) existing.late += 1;
        employeeMap.set(record.employeeId, existing);
      });
      
      const data = Array.from(employeeMap.values()).map(e => ({
        employeeName: e.name,
        totalHours: e.hours,
        daysWorked: e.days,
        lateCount: e.late
      }));
      
      setAttendanceData(data);
    } catch (error) {
      console.error("Error loading attendance report:", error);
    }
  };

  const exportToCSV = () => {
    let csv = "SELL MORE - Report Export\n";
    csv += `Generated: ${new Date().toISOString()}\n\n`;
    
    csv += "=== SALES DATA ===\n";
    csv += `Total Revenue: Rp ${salesStats.totalRevenue.toLocaleString("id-ID")}\n`;
    csv += `Total Receipts: ${salesStats.totalReceipts}\n\n`;
    
    csv += "=== TOP ITEMS ===\n";
    topItems.forEach((item, idx) => {
      csv += `${idx + 1}. ${item.itemName}: ${item.quantity} units, Rp ${item.revenue.toLocaleString("id-ID")}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const barChartData = topItems.map(item => ({
    name: item.itemName,
    value: sortBy === "quantity" ? item.quantity : item.revenue,
    revenue: item.revenue,
    quantity: item.quantity
  }));

  const pieChartData = topItems.map((item, idx) => ({
    name: item.itemName,
    value: sortBy === "quantity" ? item.quantity : item.revenue,
    color: item.itemName === "Other Items" 
      ? "#94a3b8" 
      : `hsl(${(idx * 360) / topItems.length}, 70%, 60%)`
  }));

  console.log("📊 Bar Chart Data:", barChartData);
  console.log("🥧 Pie Chart Data:", pieChartData);

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={() => window.print()} variant="ghost" size="sm">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <TabsContent value="sales" className="space-y-4 mt-0">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500">Revenue</div>
                <div className="text-lg font-bold text-green-600">
                  Rp {(salesStats.totalRevenue / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500">Receipts</div>
                <div className="text-lg font-bold">{salesStats.totalReceipts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500">Avg</div>
                <div className="text-lg font-bold">
                  Rp {(salesStats.avgTransaction / 1000).toFixed(0)}k
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="p-4">
              <div className="h-[400px] w-full">
                {salesChartData.length > 0 ? (
                  <StackedBarChart data={salesChartData} height={400} />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    No data
                  </div>
                )}
              </div>
              
              {/* Time Range Switcher */}
              <div className="flex justify-center gap-1 mt-4 pt-4 border-t">
                {(["mtd", "lm", "ytd", "ly", "5y"] as SalesTimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={salesTimeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSalesTimeRange(range)}
                    className="h-8 px-3 text-xs"
                  >
                    {range === "mtd" ? "MTD" : range === "lm" ? "LM" : range === "ytd" ? "YTD" : range === "ly" ? "LY" : "5Y"}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                {isSalesMonthlyView ? t.reports.monthlySalesData : t.reports.dailySalesData}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.reports.noData}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 font-semibold">{isSalesMonthlyView ? t.reports.month : t.reports.date}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.revenue}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.receipts}</th>
                        <th className="pb-2 font-semibold text-right">{t.common.cash}</th>
                        <th className="pb-2 font-semibold text-right">{t.common.qrisStatic}</th>
                        <th className="pb-2 font-semibold text-right">{t.common.qrisDynamic}</th>
                        <th className="pb-2 font-semibold text-right">{t.common.voucher}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((item, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2">
                            {isSalesMonthlyView 
                              ? new Date(item.date + "-01").toLocaleDateString(locale, { year: "numeric", month: "short" })
                              : new Date(item.date).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
                            }
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-2 text-right">{item.receipts}</td>
                          <td className="py-2 text-right">{formatCurrency(item.cash)}</td>
                          <td className="py-2 text-right">{formatCurrency(item.qrisStatic)}</td>
                          <td className="py-2 text-right">{formatCurrency(item.qrisDynamic)}</td>
                          <td className="py-2 text-right">{formatCurrency(item.voucher)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 font-semibold">
                      <tr>
                        <td className="pt-2">{t.reports.total}</td>
                        <td className="pt-2 text-right">
                          {formatCurrency(salesData.reduce((sum, item) => sum + item.revenue, 0))}
                        </td>
                        <td className="pt-2 text-right">
                          {salesData.reduce((sum, item) => sum + item.receipts, 0)}
                        </td>
                        <td className="pt-2 text-right">
                          {formatCurrency(salesData.reduce((sum, item) => sum + item.cash, 0))}
                        </td>
                        <td className="pt-2 text-right">
                          {formatCurrency(salesData.reduce((sum, item) => sum + item.qrisStatic, 0))}
                        </td>
                        <td className="pt-2 text-right">
                          {formatCurrency(salesData.reduce((sum, item) => sum + item.qrisDynamic, 0))}
                        </td>
                        <td className="pt-2 text-right">
                          {formatCurrency(salesData.reduce((sum, item) => sum + item.voucher, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4 mt-0">
          {/* Chart Card */}
          <Card>
            <CardContent className="p-4 relative">
              {/* Floating Controls - Top Right */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                {/* Chart Type Selector */}
                <div className="flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg p-1 shadow-sm">
                  <Button
                    variant={chartView === "bar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartView("bar")}
                    className="h-7 px-2 text-xs"
                  >
                    Bar
                  </Button>
                  <Button
                    variant={chartView === "pie" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartView("pie")}
                    className="h-7 px-2 text-xs"
                  >
                    Pie
                  </Button>
                </div>

                {/* Sort Selector */}
                <div className="flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg p-1 shadow-sm">
                  <Button
                    variant={sortBy === "quantity" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("quantity")}
                    className="h-7 px-2 text-xs"
                  >
                    Qty
                  </Button>
                  <Button
                    variant={sortBy === "revenue" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("revenue")}
                    className="h-7 px-2 text-xs"
                  >
                    $$
                  </Button>
                </div>

                {/* Top N Selector */}
                <div className="flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg p-1 shadow-sm">
                  <Button
                    variant={itemTopN === 10 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemTopN(10)}
                    className="h-7 px-2 text-xs"
                  >
                    10
                  </Button>
                  <Button
                    variant={itemTopN === 20 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemTopN(20)}
                    className="h-7 px-2 text-xs"
                  >
                    20
                  </Button>
                </div>
              </div>

              {/* Chart Area */}
              <div className="h-[400px] w-full">
                {topItems.length > 0 ? (
                  chartView === "bar" ? (
                    <HorizontalBarChart 
                      data={barChartData}
                      height={400}
                    />
                  ) : (
                    <PieChart 
                      data={pieChartData}
                      height={400}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    No data for selected period
                  </div>
                )}
              </div>

              {/* Time Range Buttons */}
              <div className="flex justify-center gap-1 mt-4 pt-4 border-t">
                {(["1d", "7d", "1m", "3m", "6m", "1y", "3y", "5y"] as ItemsTimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={itemsTimeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setItemsTimeRange(range)}
                    className="h-8 px-3 text-xs uppercase"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                {t.reports.topItemsData} ({itemTopN} {t.reports.items})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topItemsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.reports.noData}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 font-semibold">#</th>
                        <th className="pb-2 font-semibold">{t.reports.itemName}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.quantity}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.revenue}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.transactions}</th>
                        <th className="pb-2 font-semibold text-right">{t.reports.avgPerTransaction}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItemsData.map((item, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2 text-muted-foreground">{index + 1}</td>
                          <td className="py-2 font-medium">{item.name}</td>
                          <td className="py-2 text-right">{item.value.toLocaleString()}</td>
                          <td className="py-2 text-right">{formatCurrency(item.revenue || 0)}</td>
                          <td className="py-2 text-right">{item.transactionCount || 0}</td>
                          <td className="py-2 text-right">
                            {item.transactionCount 
                              ? (item.value / item.transactionCount).toFixed(1)
                              : "0"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 font-semibold">
                      <tr>
                        <td className="pt-2" colSpan={2}>{t.reports.total}</td>
                        <td className="pt-2 text-right">
                          {topItemsData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                        </td>
                        <td className="pt-2 text-right">
                          {formatCurrency(topItemsData.reduce((sum, item) => sum + (item.revenue || 0), 0))}
                        </td>
                        <td className="pt-2 text-right">
                          {topItemsData.reduce((sum, item) => sum + (item.transactionCount || 0), 0)}
                        </td>
                        <td className="pt-2 text-right">
                          {topItemsData.length > 0
                            ? (topItemsData.reduce((sum, item) => sum + item.value, 0) / 
                               topItemsData.reduce((sum, item) => sum + (item.transactionCount || 0), 0)).toFixed(1)
                            : "0"
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4 mt-0">
          {/* Time Range Switcher */}
          <div className="flex justify-end gap-2">
            <Button
              variant={attendanceTimeRange === "mtd" ? "default" : "outline"}
              size="sm"
              onClick={() => setAttendanceTimeRange("mtd")}
            >
              MTD
            </Button>
            <Button
              variant={attendanceTimeRange === "ytd" ? "default" : "outline"}
              size="sm"
              onClick={() => setAttendanceTimeRange("ytd")}
            >
              YTD
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-4">
              {attendanceData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Employee</th>
                        <th className="text-right py-2">Hours</th>
                        <th className="text-right py-2">Days</th>
                        <th className="text-right py-2">Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{record.employeeName}</td>
                          <td className="text-right">{record.totalHours.toFixed(1)}h</td>
                          <td className="text-right">{record.daysWorked}</td>
                          <td className="text-right">{record.lateCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No attendance data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}