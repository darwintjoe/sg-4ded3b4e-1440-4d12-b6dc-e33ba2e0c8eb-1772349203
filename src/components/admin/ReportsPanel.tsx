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

type SalesTimeRange = "mtd" | "lm" | "ytd" | "ly" | "5y";
type ItemsTimeRange = "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type AttendanceTimeRange = "mtd" | "ytd";
type ChartView = "bar" | "pie";
type SortBy = "quantity" | "revenue";

export function ReportsPanel() {
  const { language } = useApp();
  const locale = language === "id" ? "id-ID" : "en-US";

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) {
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
        startDate.setHours(0, 0, 0, 0);
        break;
      case "7d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "1m":
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3m":
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6m":
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "3y":
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case "5y":
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
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
        // DON'T query monthlySalesSummary - aggregate from daily data instead
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDate && d.businessDate <= endDate);
        
        // Group by month or year
        const dataMap = new Map<string, { cash: number; qrisStatic: number; qrisDynamic: number; voucher: number; receipts: number }>();
        
        filtered.forEach(d => {
          let key: string;
          if (salesTimeRange === "5y") {
            key = d.businessDate.substring(0, 4); // Year only (YYYY)
          } else {
            key = d.businessDate.substring(0, 7); // Year-Month (YYYY-MM)
          }
          
          const existing = dataMap.get(key) || { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0, receipts: 0 };
          if (d.method === "cash") existing.cash += d.totalAmount;
          else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
          else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
          else if (d.method === "voucher") existing.voucher += d.totalAmount;
          existing.receipts += d.transactionCount;
          dataMap.set(key, existing);
        });

        // Generate complete month/year range
        const periods: string[] = [];
        if (salesTimeRange === "ytd") {
          const currentYear = endDate.substring(0, 4);
          const currentMonth = parseInt(endDate.substring(5, 7));
          for (let m = 1; m <= currentMonth; m++) {
            periods.push(`${currentYear}-${m.toString().padStart(2, '0')}`);
          }
        } else if (salesTimeRange === "ly") {
          const end = new Date(endDate);
          for (let i = 11; i >= 0; i--) {
            const d = new Date(end);
            d.setMonth(end.getMonth() - i);
            periods.push(d.toISOString().substring(0, 7));
          }
        } else {
          // 5Y
          const currentYear = parseInt(endDate.substring(0, 4));
          for (let y = currentYear - 4; y <= currentYear; y++) {
            periods.push(`${y}`);
          }
        }
        
        // Build chart data with complete range
        const chartData = periods.map(period => {
          const data = dataMap.get(period);
          if (data) {
            return {
              name: salesTimeRange === "5y" ? period : period.substring(5),
              cash: data.cash,
              qrisStatic: data.qrisStatic,
              qrisDynamic: data.qrisDynamic,
              voucher: data.voucher
            };
          } else {
            return {
              name: salesTimeRange === "5y" ? period : period.substring(5),
              cash: 0,
              qrisStatic: 0,
              qrisDynamic: 0,
              voucher: 0
            };
          }
        });
        setSalesChartData(chartData);
        
        // Table data (only periods with actual data)
        const tableData = Array.from(dataMap.entries())
          .map(([period, data]) => ({
            date: period,
            revenue: data.cash + data.qrisStatic + data.qrisDynamic + data.voucher,
            receipts: data.receipts,
            cash: data.cash,
            qrisStatic: data.qrisStatic,
            qrisDynamic: data.qrisDynamic,
            voucher: data.voucher
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setSalesData(tableData);

        let totalRevenue = 0;
        let totalReceipts = 0;
        dataMap.forEach(data => {
          totalRevenue += data.cash + data.qrisStatic + data.qrisDynamic + data.voucher;
          totalReceipts += data.receipts;
        });

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0
        });
      } else {
        // Daily view - same as before
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

        // Generate complete date range
        const dates: string[] = [];
        if (salesTimeRange === "mtd") {
          const today = new Date(endDate);
          const currentDay = today.getDate();
          for (let d = 1; d <= currentDay; d++) {
            const date = new Date(today.getFullYear(), today.getMonth(), d);
            dates.push(date.toISOString().split('T')[0]);
          }
        } else {
          // LM: exactly last 30 days
          const end = new Date(endDate);
          for (let i = 29; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(end.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
          }
        }

        // Build chart data with complete range
        const chartData = dates.map(date => {
          const data = dataMap.get(date);
          if (data) {
            return {
              name: date.substring(5),
              cash: data.cash,
              qrisStatic: data.qrisStatic,
              qrisDynamic: data.qrisDynamic,
              voucher: data.voucher
            };
          } else {
            return {
              name: date.substring(5),
              cash: 0,
              qrisStatic: 0,
              qrisDynamic: 0,
              voucher: 0
            };
          }
        });
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
      let startDate: Date;
      let useMonthly = false;

      // Determine date range and whether to use monthly data
      switch (itemsTimeRange) {
        case "1d":
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "7d":
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "1m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "3m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 3);
          useMonthly = true;
          break;
        case "6m":
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 6);
          useMonthly = true;
          break;
        case "1y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 1);
          useMonthly = true;
          break;
        case "3y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 3);
          useMonthly = true;
          break;
        case "5y":
          startDate = new Date(today);
          startDate.setFullYear(startDate.getFullYear() - 5);
          useMonthly = true;
          break;
        default:
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
      }

      console.log("📅 Date range:", startDate.toISOString().split('T')[0], "to", today.toISOString().split('T')[0]);
      console.log("🔄 Days diff:", Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), "Use monthly:", useMonthly);

      const itemMap = new Map<number, { name: string; quantity: number; revenue: number; transactions: number }>();

      if (useMonthly) {
        const startMonth = startDate.toISOString().split('T')[0].substring(0, 7);
        const endMonth = today.toISOString().split('T')[0].substring(0, 7);
        console.log("📆 Monthly range:", startMonth, "to", endMonth);
        console.log("🔍 Querying monthlyItemSales table...");
        
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
        console.log("📆 Daily range:", startDate.toISOString().split('T')[0], "to", today.toISOString().split('T')[0]);
        console.log("🔍 Querying dailyItemSales table...");
        
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        console.log("📦 Total daily records in DB:", allDaily.length);
        console.log("📦 Sample daily record:", allDaily[0]);
        
        const filtered = allDaily.filter(d => {
          const hasBusinessDate = d.businessDate >= startDate.toISOString().split('T')[0] && d.businessDate <= today.toISOString().split('T')[0];
          const hasDateField = (d as any).date >= startDate.toISOString().split('T')[0] && (d as any).date <= today.toISOString().split('T')[0];
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
              <div className="flex justify-center gap-1 mt-3 pt-3 border-t">
                {(["mtd", "lm", "ytd", "ly", "5y"] as SalesTimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={salesTimeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSalesTimeRange(range)}
                    className="h-6 px-2 text-[10px] uppercase"
                  >
                    {range === "mtd" ? "MTD" : range === "lm" ? "LM" : range === "ytd" ? "YTD" : range === "ly" ? "LY" : "5Y"}
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