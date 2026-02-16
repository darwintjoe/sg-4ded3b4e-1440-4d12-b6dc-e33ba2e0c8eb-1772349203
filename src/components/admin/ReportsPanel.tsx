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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SalesTimeRange = "l30d" | "mtd" | "lm" | "ytd" | "ly" | "5y";
type ItemsTimeRange = "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type AttendanceTimeRange = "mtd" | "ytd";
type ChartView = "bar" | "pie";
type SortBy = "quantity" | "revenue";

export function ReportsPanel() {
  const { language } = useApp();
  const locale = language === "id" ? "id-ID" : "en-US";

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(2) + "B";
    } else if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + "M";
    } else if (amount >= 1_000) {
      return (amount / 1_000).toFixed(0) + "K";
    }
    return amount.toLocaleString();
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
      totalRevenue: "Total Revenue",
      totalReceipts: "Total Receipts",
      avgTransaction: "Avg Transaction",
      paymentBreakdown: "Payment Breakdown",
      topItemsByQuantity: "Top Items by Quantity",
      topItemsByRevenue: "Top Items by Revenue",
    }
  };

  // Sales state
  const [salesTimeRange, setSalesTimeRange] = useState<SalesTimeRange>("l30d");
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

  const getSalesDateRange = (): { startDate: string; endDate: string; useMonthly: boolean } => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (salesTimeRange === "l30d") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { startDate: thirtyDaysAgo.toISOString().split("T")[0], endDate: todayStr, useMonthly: false };
    } else if (salesTimeRange === "mtd") {
      const monthStart = todayStr.substring(0, 8) + "01";
      return { startDate: monthStart, endDate: todayStr, useMonthly: false };
    } else if (salesTimeRange === "lm") {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: lastMonthStart.toISOString().split("T")[0], endDate: lastMonthEnd.toISOString().split("T")[0], useMonthly: false };
    } else if (salesTimeRange === "ytd") {
      const yearStart = todayStr.substring(0, 4) + "-01-01";
      return { startDate: yearStart, endDate: todayStr, useMonthly: true };
    } else if (salesTimeRange === "ly") {
      const lastYearStart = (today.getFullYear() - 1) + "-01-01";
      const lastYearEnd = (today.getFullYear() - 1) + "-12-31";
      return { startDate: lastYearStart, endDate: lastYearEnd, useMonthly: true };
    } else {
      // 5y
      const fiveYearsAgo = new Date(today);
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      return { startDate: fiveYearsAgo.toISOString().split("T")[0], endDate: todayStr, useMonthly: true };
    }
  };

  const loadSalesReport = async () => {
    try {
      const { startDate, endDate, useMonthly } = getSalesDateRange();

      if (useMonthly) {
        // Query Monthly Tables (Two-Tier Architecture)
        // For long ranges, we use the pre-aggregated monthly tables
        // PLUS the current month's daily data aggregated on the fly
        
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        const currentMonth = new Date().toISOString().substring(0, 7);

        // 1. Get historical monthly data
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);

        // 2. Get current month daily data and aggregate it
        // We only do this if the requested range includes the current month
        let currentMonthData = null;
        if (endMonth >= currentMonth) {
          const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
          const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
          
          if (currentDaily.length > 0) {
            currentMonthData = {
              yearMonth: currentMonth,
              totalRevenue: 0,
              totalReceipts: 0,
              cashAmount: 0,
              qrisStaticAmount: 0,
              qrisDynamicAmount: 0,
              voucherAmount: 0
            };

            currentDaily.forEach(d => {
              currentMonthData!.totalRevenue += d.totalAmount;
              currentMonthData!.totalReceipts += d.transactionCount; // This is approximate, summing daily counts
              if (d.method === "cash") currentMonthData!.cashAmount += d.totalAmount;
              else if (d.method === "qris-static") currentMonthData!.qrisStaticAmount += d.totalAmount;
              else if (d.method === "qris-dynamic") currentMonthData!.qrisDynamicAmount += d.totalAmount;
              else if (d.method === "voucher") currentMonthData!.voucherAmount += d.totalAmount;
            });
          }
        }

        // Combine historical + current
        const combinedData = [...filteredMonthly];
        if (currentMonthData) {
          // Check if current month already exists in monthly table (shouldn't, but safety check)
          const exists = combinedData.find(m => m.yearMonth === currentMonth);
          if (!exists) {
            combinedData.push(currentMonthData as MonthlySalesSummary);
          } else {
             // If exists, replace it with fresh daily aggregation
             const idx = combinedData.indexOf(exists);
             combinedData[idx] = currentMonthData as MonthlySalesSummary;
          }
        }

        // Sort by date
        combinedData.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

        // Group by year for 5Y view
        if (salesTimeRange === "5y") {
          const yearlyMap = new Map<string, any>();
          
          combinedData.forEach(m => {
            const year = m.yearMonth.substring(0, 4);
            const existing = yearlyMap.get(year) || { 
              name: year, cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0, receipts: 0, revenue: 0 
            };
            
            existing.cash += m.cashAmount;
            existing.qrisStatic += m.qrisStaticAmount;
            existing.qrisDynamic += m.qrisDynamicAmount;
            existing.voucher += m.voucherAmount;
            existing.receipts += m.totalReceipts;
            existing.revenue += m.totalRevenue;
            
            yearlyMap.set(year, existing);
          });
          
          const chartData = Array.from(yearlyMap.values());
          setSalesChartData(chartData);
          
          const tableData = chartData.map(d => ({
            date: d.name,
            revenue: d.revenue,
            receipts: d.receipts,
            cash: d.cash,
            qrisStatic: d.qrisStatic,
            qrisDynamic: d.qrisDynamic,
            voucher: d.voucher
          })).sort((a, b) => b.date.localeCompare(a.date));
          
          setSalesData(tableData);
        } else {
          // Monthly view (YTD, LY)
          const chartData = combinedData.map(m => ({
            name: m.yearMonth.substring(5), // MM
            fullDate: m.yearMonth,
            cash: m.cashAmount,
            qrisStatic: m.qrisStaticAmount,
            qrisDynamic: m.qrisDynamicAmount,
            voucher: m.voucherAmount
          }));
          setSalesChartData(chartData);
          
          const tableData = combinedData.map(m => ({
            date: m.yearMonth,
            revenue: m.totalRevenue,
            receipts: m.totalReceipts,
            cash: m.cashAmount,
            qrisStatic: m.qrisStaticAmount,
            qrisDynamic: m.qrisDynamicAmount,
            voucher: m.voucherAmount
          })).sort((a, b) => b.date.localeCompare(a.date));
          
          setSalesData(tableData);
        }

        // Calculate totals
        let totalRevenue = 0;
        let totalReceipts = 0;
        combinedData.forEach(d => {
          totalRevenue += d.totalRevenue;
          totalReceipts += d.totalReceipts;
        });

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });

      } else {
        // Daily View (L30D, MTD, LM)
        // Query daily table directly
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const dataMap = new Map<string, { cash: number; qrisStatic: number; qrisDynamic: number; voucher: number; receipts: number }>();
        
        allDaily.forEach(d => {
          if (d.businessDate >= startDate && d.businessDate <= endDate) {
            const existing = dataMap.get(d.businessDate) || { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0, receipts: 0 };
            if (d.method === "cash") existing.cash += d.totalAmount;
            else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
            else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
            else if (d.method === "voucher") existing.voucher += d.totalAmount;
            existing.receipts += d.transactionCount;
            dataMap.set(d.businessDate, existing);
          }
        });

        // Generate complete date range for chart
        const chartData = [];
        const dateList = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          dateList.push(dateStr);
          
          const data = dataMap.get(dateStr);
          if (data) {
            chartData.push({
              name: dateStr.substring(8), // DD
              fullDate: dateStr,
              cash: data.cash,
              qrisStatic: data.qrisStatic,
              qrisDynamic: data.qrisDynamic,
              voucher: data.voucher
            });
          } else {
            chartData.push({
              name: dateStr.substring(8),
              fullDate: dateStr,
              cash: 0,
              qrisStatic: 0,
              qrisDynamic: 0,
              voucher: 0
            });
          }
        }
        
        setSalesChartData(chartData);

        // Table data (only dates with actual data)
        const tableData = Array.from(dataMap.entries())
          .map(([date, data]) => ({
            date,
            revenue: data.cash + data.qrisStatic + data.qrisDynamic + data.voucher,
            receipts: data.receipts,
            cash: data.cash,
            qrisStatic: data.qrisStatic,
            qrisDynamic: data.qrisDynamic,
            voucher: data.voucher
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setSalesData(tableData);

        let totalReceipts = 0;
        let totalRevenue = 0;
        dataMap.forEach(data => {
          totalRevenue += data.cash + data.qrisStatic + data.qrisDynamic + data.voucher;
          totalReceipts += data.receipts;
        });

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
      setSalesChartData([]);
      setSalesData([]);
      setSalesStats({ totalRevenue: 0, totalReceipts: 0, avgTransaction: 0 });
    }
  };

  const loadItemsReport = async () => {
    try {
      console.log("🔍 Items report triggered - Range:", itemsTimeRange, "TopN:", itemTopN, "Sort:", sortBy);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      let startDate: Date;
      let useMonthly = false;

      // Determine date range and whether to use monthly data
      switch (itemsTimeRange) {
        case "1d":
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0); // Start of today
          break;
        case "7d":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
          startDate.setHours(0, 0, 0, 0);
          break;
        case "1m":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
          startDate.setHours(0, 0, 0, 0);
          break;
        case "3m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 3);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "6m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 6);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "1y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "3y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 3);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        case "5y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 5);
          startDate.setHours(0, 0, 0, 0);
          useMonthly = true;
          break;
        default:
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
      }

      console.log("📅 Date range:", startDate.toISOString().split('T')[0], "to", today.toISOString().split('T')[0]);
      console.log("Use monthly:", useMonthly);

      const itemMap = new Map<number, { name: string; quantity: number; revenue: number; transactions: number }>();

      if (useMonthly) {
        // Two-Tier Query: Monthly + Current Daily
        const startMonth = startDate.toISOString().split('T')[0].substring(0, 7);
        const currentMonth = today.toISOString().split('T')[0].substring(0, 7);
        
        // 1. Get historical monthly data
        const allMonthly = await db.getAll<MonthlyItemSales>("monthlyItemSales");
        const filteredMonthly = allMonthly.filter(m => m.yearMonth >= startMonth && m.yearMonth < currentMonth);
        
        filteredMonthly.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });

        // 2. Get current month daily data
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        const currentDaily = allDaily.filter(d => d.businessDate.startsWith(currentMonth));
        
        currentDaily.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });

      } else {
        // Daily Query Only (1D - L30D)
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = today.toISOString().split('T')[0];
        
        const filtered = allDaily.filter(d => d.businessDate >= startDateStr && d.businessDate <= endDateStr);
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0, transactions: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          existing.transactions += item.transactionCount;
          itemMap.set(item.itemId, existing);
        });
      }

      // Sort by selected criteria
      const allItems = Array.from(itemMap.values());
      const sorted = allItems.sort((a, b) => 
        sortBy === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue
      );
      
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
          <div className="grid grid-cols-3 gap-1.5">
            <Card>
              <CardContent className="pt-2 pb-2 px-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.totalRevenue}</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">{formatCurrency(salesStats.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-2 pb-2 px-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.totalReceipts}</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">{salesStats.totalReceipts}</p>
                  </div>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-2 pb-2 px-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{t.reports.avgTransaction}</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">{formatCurrency(salesStats.avgTransaction)}</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart - Full Width, Takes Most of Screen */}
          <Card>
            <CardContent className="p-2">
              <div className="space-y-3">
                {/* Payment Methods Breakdown */}
                <div>
                  <h4 className="text-[10px] font-medium mb-2">{t.reports.paymentBreakdown}</h4>
                  <div className="h-[320px]">
                    <StackedBarChart
                      data={salesChartData}
                    />
                  </div>
                </div>
              </div>
              
              {/* Time Range Switcher */}
              <div className="flex justify-center gap-1 mt-3 pt-3 border-t overflow-x-auto">
                {(["l30d", "mtd", "lm", "ytd", "ly", "5y"] as SalesTimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={salesTimeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSalesTimeRange(range)}
                    className="h-6 px-2 text-[10px] uppercase whitespace-nowrap"
                  >
                    {range === "l30d" ? "L30D" : range === "mtd" ? "MTD" : range === "lm" ? "LM" : range === "ytd" ? "YTD" : range === "ly" ? "LY" : "5Y"}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales Data Table - Below Chart (Scroll to View) */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Table2 className="h-3 w-3" />
                {isSalesMonthlyView ? t.reports.monthlySalesData : t.reports.dailySalesData}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {salesData.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <div className="inline-block min-w-full align-middle">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">{isSalesMonthlyView ? t.reports.month : t.reports.date}</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rev</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rcpt</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">Cash</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">QR-S</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">QR-D</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2 whitespace-nowrap">Vchr</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((row, idx) => (
                          <TableRow key={idx} className="border-b hover:bg-muted/50">
                            <TableCell className="text-[10px] font-medium py-1 px-2 whitespace-nowrap">{row.date}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2">{row.receipts}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.cash)}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.qrisStatic)}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.qrisDynamic)}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(row.voucher)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50">
                          <TableCell className="text-[10px] font-bold py-1 px-2">Total</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.revenue, 0))}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2">{salesData.reduce((sum, row) => sum + row.receipts, 0)}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.cash, 0))}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.qrisStatic, 0))}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.qrisDynamic, 0))}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(salesData.reduce((sum, row) => sum + row.voucher, 0))}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-6">
                  {t.reports.noData}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4 mt-0">
          {/* Chart Card - Full Width, Takes Most of Screen */}
          <Card>
            <CardContent className="p-2">
              <div className="relative">
                {/* Floating Controls - Top Right */}
                <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
                  {/* Chart Type Selector */}
                  <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                    <Button
                      variant={chartView === "bar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartView("bar")}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      Bar
                    </Button>
                    <Button
                      variant={chartView === "pie" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartView("pie")}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      Pie
                    </Button>
                  </div>

                  {/* Sort Selector */}
                  <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                    <Button
                      variant={sortBy === "quantity" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy("quantity")}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      Qty
                    </Button>
                    <Button
                      variant={sortBy === "revenue" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy("revenue")}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      $$
                    </Button>
                  </div>

                  {/* Top N Selector */}
                  <div className="flex gap-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded p-0.5 shadow-sm">
                    <Button
                      variant={itemTopN === 10 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setItemTopN(10)}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      10
                    </Button>
                    <Button
                      variant={itemTopN === 20 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setItemTopN(20)}
                      className="h-5 px-1.5 text-[9px]"
                    >
                      20
                    </Button>
                  </div>
                </div>

                {/* Chart Area */}
                <div>
                  <h4 className="text-[10px] font-medium mb-2">
                    {chartView === "bar" ? t.reports.topItemsByQuantity : t.reports.topItemsByRevenue}
                  </h4>
                  <div className={chartView === "pie" ? "h-[300px]" : "h-[360px]"}>
                    {chartView === "bar" ? (
                      <HorizontalBarChart data={barChartData} />
                    ) : (
                      <PieChart data={pieChartData} />
                    )}
                  </div>
                </div>

                {/* Time Range Buttons */}
                <div className="flex justify-center gap-0.5 mt-3 pt-3 border-t flex-wrap">
                  {(["1d", "7d", "1m", "3m", "6m", "1y", "3y", "5y"] as ItemsTimeRange[]).map((range) => (
                    <Button
                      key={range}
                      variant={itemsTimeRange === range ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setItemsTimeRange(range)}
                      className="h-6 px-2 text-[10px] uppercase"
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Data Table - Below Chart (Scroll to View) */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Table2 className="h-3 w-3" />
                {t.reports.topItemsData} ({itemTopN} Items)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {topItemsData.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <div className="inline-block min-w-full align-middle">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="w-8 text-[10px] font-medium py-1 px-2">#</TableHead>
                          <TableHead className="text-[10px] font-medium py-1 px-2 min-w-[100px]">Item</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Qty</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Rev</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Tx</TableHead>
                          <TableHead className="text-right text-[10px] font-medium py-1 px-2">Avg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topItemsData.map((item, idx) => (
                          <TableRow key={idx} className="border-b hover:bg-muted/50">
                            <TableCell className="text-[10px] font-medium py-1 px-2">{idx + 1}</TableCell>
                            <TableCell className="text-[10px] py-1 px-2 truncate max-w-[150px]">{item.name}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2">{item.value}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2 whitespace-nowrap">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2">{item.transactionCount}</TableCell>
                            <TableCell className="text-right text-[10px] py-1 px-2">{(item.value / item.transactionCount).toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="text-[10px] font-bold py-1 px-2">Total</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2">{topItemsData.reduce((sum, item) => sum + item.value, 0)}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(topItemsData.reduce((sum, item) => sum + item.revenue, 0))}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2">{topItemsData.reduce((sum, item) => sum + item.transactionCount, 0)}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold py-1 px-2">
                            {(topItemsData.reduce((sum, item) => sum + item.value, 0) / topItemsData.reduce((sum, item) => sum + item.transactionCount, 0)).toFixed(1)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-6">
                  {t.reports.noData}
                </p>
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