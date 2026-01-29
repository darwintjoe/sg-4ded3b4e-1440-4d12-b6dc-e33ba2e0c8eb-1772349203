import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import { DailyItemSales, DailyPaymentSales, DailyAttendance, MonthlyItemSales, MonthlySalesSummary, MonthlyAttendanceSummary } from "@/types";
import { translate } from "@/lib/translations";
import { useApp } from "@/contexts/AppContext";
import { BarChart3, Calendar, Users, DollarSign, TrendingUp, Download, Zap, Printer } from "lucide-react";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { PieChart } from "@/components/charts/PieChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";

type DateRange = "today" | "week" | "month" | "year" | "custom";

export function ReportsPanel() {
  const { language } = useApp();
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Chart data
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [chartViewMode, setChartViewMode] = useState<"daily" | "monthly">("daily");

  // Sales data
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    totalReceipts: 0,
    avgTransaction: 0,
    paymentBreakdown: {
      cash: 0,
      qrisStatic: 0,
      qrisDynamic: 0,
      voucher: 0
    }
  });

  // Top items
  const [topItems, setTopItems] = useState<Array<{
    itemName: string;
    quantity: number;
    revenue: number;
  }>>([]);

  // Item report controls
  const [itemTopN, setItemTopN] = useState<10 | 20>(10);
  const [itemMetric, setItemMetric] = useState<"quantity" | "revenue">("quantity");
  const [itemChartType, setItemChartType] = useState<"pie" | "bar">("bar");
  const [itemTimeRange, setItemTimeRange] = useState<"daily" | "mtd" | "ytd">("mtd");

  // Attendance stats
  const [attendanceStats, setAttendanceStats] = useState({
    totalEmployees: 0,
    totalHours: 0,
    avgHoursPerEmployee: 0,
    lateCount: 0
  });

  // Attendance time range
  const [attendanceTimeRange, setAttendanceTimeRange] = useState<"mtd" | "ytd">("mtd");

  useEffect(() => {
    loadReports();
  }, [dateRange, customStart, customEnd, itemTopN, itemMetric, itemTimeRange, attendanceTimeRange]);

  const getDateRangeBounds = (): { startDate: string; endDate: string } => {
    const today = new Date().toISOString().split("T")[0];
    
    switch (dateRange) {
      case "today":
        return { startDate: today, endDate: today };
      
      case "week": {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { startDate: weekAgo.toISOString().split("T")[0], endDate: today };
      }
      
      case "month": {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { startDate: monthAgo.toISOString().split("T")[0], endDate: today };
      }
      
      case "year": {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { startDate: yearAgo.toISOString().split("T")[0], endDate: today };
      }
      
      case "custom":
        return { startDate: customStart, endDate: customEnd };
      
      default:
        return { startDate: today, endDate: today };
    }
  };

  const loadReports = async () => {
    const { startDate, endDate } = getDateRangeBounds();
    
    // Determine if we should query daily or monthly summaries
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const useMonthly = daysDiff > 31;

    await Promise.all([
      loadSalesReport(startDate, endDate, useMonthly),
      loadTopItems(startDate, endDate, useMonthly),
      loadAttendanceReport(startDate, endDate, useMonthly)
    ]);
  };

  const loadSalesReport = async (startDate: string, endDate: string, useMonthly: boolean) => {
    try {
      setChartViewMode(useMonthly ? "monthly" : "daily");
      
      if (useMonthly) {
        // Query monthly summaries for fast multi-year reports
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        
        // Prepare chart data
        const chartData = filtered.map(m => ({
          name: m.month,
          cash: m.cashAmount,
          qrisStatic: m.qrisStaticAmount,
          qrisDynamic: m.qrisDynamicAmount,
          voucher: m.voucherAmount
        }));
        setSalesChartData(chartData);
        
        const totalRevenue = filtered.reduce((sum, m) => sum + m.totalRevenue, 0);
        const totalReceipts = filtered.reduce((sum, m) => sum + m.totalReceipts, 0);
        
        const paymentBreakdown = {
          cash: filtered.reduce((sum, m) => sum + m.cashAmount, 0),
          qrisStatic: filtered.reduce((sum, m) => sum + m.qrisStaticAmount, 0),
          qrisDynamic: filtered.reduce((sum, m) => sum + m.qrisDynamicAmount, 0),
          voucher: filtered.reduce((sum, m) => sum + m.voucherAmount, 0)
        };

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0,
          paymentBreakdown
        });
      } else {
        // Query daily summaries for short date ranges
        const allDaily = await db.getAll<DailyPaymentSales>("dailyPaymentSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDate && d.businessDate <= endDate);
        
        // Group by date for chart
        const dateMap = new Map<string, { cash: number; qrisStatic: number; qrisDynamic: number; voucher: number }>();
        
        // Initialize all dates in range with 0 (optional, skipping for brevity but good for continuous chart)
        
        filtered.forEach(d => {
          const existing = dateMap.get(d.businessDate) || { cash: 0, qrisStatic: 0, qrisDynamic: 0, voucher: 0 };
          if (d.method === "cash") existing.cash += d.totalAmount;
          else if (d.method === "qris-static") existing.qrisStatic += d.totalAmount;
          else if (d.method === "qris-dynamic") existing.qrisDynamic += d.totalAmount;
          else if (d.method === "voucher") existing.voucher += d.totalAmount;
          dateMap.set(d.businessDate, existing);
        });

        const chartData = Array.from(dateMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, data]) => ({
            name: date.substring(5), // Show MM-DD
            ...data
          }));
        setSalesChartData(chartData);

        const paymentBreakdown = {
          cash: 0,
          qrisStatic: 0,
          qrisDynamic: 0,
          voucher: 0
        };

        let totalReceipts = 0;

        filtered.forEach(payment => {
          if (payment.method === "cash") paymentBreakdown.cash += payment.totalAmount;
          else if (payment.method === "qris-static") paymentBreakdown.qrisStatic += payment.totalAmount;
          else if (payment.method === "qris-dynamic") paymentBreakdown.qrisDynamic += payment.totalAmount;
          else if (payment.method === "voucher") paymentBreakdown.voucher += payment.totalAmount;
          
          totalReceipts += payment.transactionCount;
        });

        const totalRevenue = Object.values(paymentBreakdown).reduce((sum, val) => sum + val, 0);

        setSalesStats({
          totalRevenue,
          totalReceipts,
          avgTransaction: totalReceipts > 0 ? totalRevenue / totalReceipts : 0,
          paymentBreakdown
        });
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
    }
  };

  const loadTopItems = async (startDate: string, endDate: string, useMonthly: boolean) => {
    try {
      if (useMonthly) {
        // Query monthly item sales for multi-year ranges
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlyItemSales>("monthlyItemSales");
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        
        // Aggregate by itemId
        const itemMap = new Map<number, { name: string; quantity: number; revenue: number }>();
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          itemMap.set(item.itemId, existing);
        });
        
        // Sort by selected metric
        const sortKey = itemMetric === "quantity" ? "quantity" : "revenue";
        const sorted = Array.from(itemMap.values()).sort((a, b) => b[sortKey] - a[sortKey]);
        
        // Take top N and aggregate the rest as "Other Items"
        const topN = sorted.slice(0, itemTopN);
        const others = sorted.slice(itemTopN);
        
        const result = topN.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        }));
        
        // Add "Other Items" if there are more items
        if (others.length > 0) {
          result.push({
            itemName: "🔹 Other Items",
            quantity: others.reduce((sum, item) => sum + item.quantity, 0),
            revenue: others.reduce((sum, item) => sum + item.revenue, 0)
          });
        }
        
        setTopItems(result);
      } else {
        // Query daily item sales for short ranges
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        
        // Apply itemTimeRange filter
        let filtered: DailyItemSales[];
        const today = new Date().toISOString().split("T")[0];
        
        if (itemTimeRange === "daily") {
          filtered = allDaily.filter(d => d.businessDate === today);
        } else if (itemTimeRange === "mtd") {
          const monthStart = today.substring(0, 8) + "01";
          filtered = allDaily.filter(d => d.businessDate >= monthStart && d.businessDate <= today);
        } else {
          // ytd
          const yearStart = today.substring(0, 4) + "-01-01";
          filtered = allDaily.filter(d => d.businessDate >= yearStart && d.businessDate <= today);
        }
        
        const itemMap = new Map<number, { name: string; quantity: number; revenue: number }>();
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          itemMap.set(item.itemId, existing);
        });
        
        // Sort by selected metric
        const sortKey = itemMetric === "quantity" ? "quantity" : "revenue";
        const sorted = Array.from(itemMap.values()).sort((a, b) => b[sortKey] - a[sortKey]);
        
        // Take top N and aggregate the rest as "Other Items"
        const topN = sorted.slice(0, itemTopN);
        const others = sorted.slice(itemTopN);
        
        const result = topN.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        }));
        
        // Add "Other Items" if there are more items
        if (others.length > 0) {
          result.push({
            itemName: "🔹 Other Items",
            quantity: others.reduce((sum, item) => sum + item.quantity, 0),
            revenue: others.reduce((sum, item) => sum + item.revenue, 0)
          });
        }
        
        setTopItems(result);
      }
    } catch (error) {
      console.error("Error loading top items:", error);
    }
  };

  const loadAttendanceReport = async (startDate: string, endDate: string, useMonthly: boolean) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Override date range based on attendanceTimeRange
      let actualStartDate: string;
      const actualEndDate: string = today;
      
      if (attendanceTimeRange === "mtd") {
        actualStartDate = today.substring(0, 8) + "01"; // First day of current month
      } else {
        // ytd
        actualStartDate = today.substring(0, 4) + "-01-01"; // First day of current year
      }
      
      if (useMonthly) {
        const startMonth = actualStartDate.substring(0, 7);
        const endMonth = actualEndDate.substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlyAttendanceSummary>("monthlyAttendanceSummary");
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        
        const employeeMap = new Map<number, { hours: number; late: number }>();
        
        filtered.forEach(record => {
          const existing = employeeMap.get(record.employeeId) || { hours: 0, late: 0 };
          existing.hours += record.totalHours;
          existing.late += record.lateCount;
          employeeMap.set(record.employeeId, existing);
        });
        
        const totalHours = Array.from(employeeMap.values()).reduce((sum, e) => sum + e.hours, 0);
        const totalLate = Array.from(employeeMap.values()).reduce((sum, e) => sum + e.late, 0);
        const totalEmployees = employeeMap.size;

        setAttendanceStats({
          totalEmployees,
          totalHours,
          avgHoursPerEmployee: totalEmployees > 0 ? totalHours / totalEmployees : 0,
          lateCount: totalLate
        });
      } else {
        const allDaily = await db.getAll<DailyAttendance>("dailyAttendance");
        const filtered = allDaily.filter(d => d.date >= actualStartDate && d.date <= actualEndDate);
        
        const employeeMap = new Map<number, { hours: number; late: number }>();
        
        filtered.forEach(record => {
          const existing = employeeMap.get(record.employeeId) || { hours: 0, late: 0 };
          existing.hours += record.hoursWorked;
          if (record.isLate) existing.late += 1;
          employeeMap.set(record.employeeId, existing);
        });
        
        const totalHours = Array.from(employeeMap.values()).reduce((sum, e) => sum + e.hours, 0);
        const totalLate = Array.from(employeeMap.values()).reduce((sum, e) => sum + e.late, 0);
        const totalEmployees = employeeMap.size;

        setAttendanceStats({
          totalEmployees,
          totalHours,
          avgHoursPerEmployee: totalEmployees > 0 ? totalHours / totalEmployees : 0,
          lateCount: totalLate
        });
      }
    } catch (error) {
      console.error("Error loading attendance report:", error);
    }
  };

  const exportToCSV = () => {
    const { startDate, endDate } = getDateRangeBounds();
    let csv = "Report Type,Period,Metric,Value\n";
    
    csv += `Sales,${startDate} to ${endDate},Total Revenue,${salesStats.totalRevenue}\n`;
    csv += `Sales,${startDate} to ${endDate},Total Receipts,${salesStats.totalReceipts}\n`;
    csv += `Sales,${startDate} to ${endDate},Cash,${salesStats.paymentBreakdown.cash}\n`;
    csv += `Sales,${startDate} to ${endDate},QRIS Static,${salesStats.paymentBreakdown.qrisStatic}\n`;
    csv += `Sales,${startDate} to ${endDate},QRIS Dynamic,${salesStats.paymentBreakdown.qrisDynamic}\n`;
    csv += `Sales,${startDate} to ${endDate},Voucher,${salesStats.paymentBreakdown.voucher}\n`;
    
    csv += `\nTop Items,Item Name,Quantity,Revenue\n`;
    topItems.forEach(item => {
      csv += `Top Items,${item.itemName},${item.quantity},${item.revenue}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #reports-content, #reports-content * {
            visibility: visible;
          }
          #reports-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div id="reports-content" className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full no-print">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold text-green-700 dark:text-green-400">LIGHTNING FAST</span>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <Select value={dateRange} onValueChange={(val) => setDateRange(val as DateRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === "custom" && (
              <>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-auto"
                />
                <span className="self-center text-slate-500">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-auto"
                />
              </>
            )}
            
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 no-print">
            <TabsTrigger value="sales">Sales Overview</TabsTrigger>
            <TabsTrigger value="items">Top Items</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Sales Overview</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {chartViewMode === "daily" ? "Daily Breakdown (MTD)" : "Monthly Breakdown (YTD)"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-green-600">
                    Rp {salesStats.totalRevenue.toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-slate-500">{salesStats.totalReceipts} transactions</p>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[400px] w-full">
                  {salesChartData.length > 0 ? (
                    <StackedBarChart data={salesChartData} height={400} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      No data available for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-green-600">
                    Rp {salesStats.totalRevenue.toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Total Receipts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-blue-600">
                    {salesStats.totalReceipts}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Avg Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-purple-600">
                    Rp {Math.round(salesStats.avgTransaction).toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Cash Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-emerald-600">
                    Rp {salesStats.paymentBreakdown.cash.toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle>Top Items Report</CardTitle>
                <div className="flex items-center gap-3 no-print">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Show:</label>
                    <Select value={itemTopN.toString()} onValueChange={(val) => setItemTopN(Number(val) as 10 | 20)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="20">Top 20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">By:</label>
                    <Select value={itemMetric} onValueChange={(val) => setItemMetric(val as "quantity" | "revenue")}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Chart:</label>
                    <Select value={itemChartType} onValueChange={(val) => setItemChartType(val as "pie" | "bar")}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="pie">Pie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Period:</label>
                    <Select value={itemTimeRange} onValueChange={(val) => setItemTimeRange(val as "daily" | "mtd" | "ytd")}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Today</SelectItem>
                        <SelectItem value="mtd">MTD</SelectItem>
                        <SelectItem value="ytd">YTD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {topItems.length > 0 ? (
                  <div className="h-[500px] w-full">
                    {itemChartType === "pie" ? (
                      <PieChart 
                        data={topItems.map((item, idx) => ({
                          name: item.itemName,
                          value: itemMetric === "quantity" ? item.quantity : item.revenue,
                          color: item.itemName.startsWith("🔹") 
                            ? "#94a3b8" 
                            : `hsl(${(idx * 360) / Math.min(itemTopN, topItems.length - 1)}, 70%, 60%)`
                        }))}
                        height={500}
                        showPercentage={false}
                      />
                    ) : (
                      <HorizontalBarChart 
                        data={topItems.map((item, idx) => ({
                          name: item.itemName,
                          value: itemMetric === "quantity" ? item.quantity : item.revenue,
                          color: item.itemName.startsWith("🔹") 
                            ? "#94a3b8" 
                            : `hsl(${(idx * 360) / Math.min(itemTopN, topItems.length - 1)}, 70%, 60%)`
                        }))}
                        height={500}
                        valueFormatter={itemMetric === "revenue" 
                          ? (val) => `Rp ${val.toLocaleString("id-ID")}`
                          : undefined
                        }
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex h-[400px] items-center justify-center">
                    <div className="text-center space-y-4">
                      <TrendingUp className="h-16 w-16 mx-auto text-slate-300" />
                      <p className="text-slate-500">No sales data for this period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle>Attendance Summary</CardTitle>
                <div className="flex items-center gap-2 no-print">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Period:</label>
                  <Select value={attendanceTimeRange} onValueChange={(val) => setAttendanceTimeRange(val as "mtd" | "ytd")}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtd">MTD</SelectItem>
                      <SelectItem value="ytd">YTD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Total Employees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-blue-600">
                    {attendanceStats.totalEmployees}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-green-600">
                    {attendanceStats.totalHours.toFixed(1)}h
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Avg Hours/Employee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-purple-600">
                    {attendanceStats.avgHoursPerEmployee.toFixed(1)}h
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Late Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-red-600">
                    {attendanceStats.lateCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {attendanceStats.totalEmployees === 0 && (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Users className="h-16 w-16 mx-auto text-slate-300" />
                  <p className="text-slate-500">No attendance records for this period</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}