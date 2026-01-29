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
import { BarChart3, Calendar, Users, DollarSign, TrendingUp, Download, Zap } from "lucide-react";

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

  // Attendance stats
  const [attendanceStats, setAttendanceStats] = useState({
    totalEmployees: 0,
    totalHours: 0,
    avgHoursPerEmployee: 0,
    lateCount: 0
  });

  useEffect(() => {
    loadReports();
  }, [dateRange, customStart, customEnd]);

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
      if (useMonthly) {
        // Query monthly summaries for fast multi-year reports
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        
        const allMonthly = await db.getAll<MonthlySalesSummary>("monthlySalesSummary");
        const filtered = allMonthly.filter(m => m.month >= startMonth && m.month <= endMonth);
        
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
        
        const sorted = Array.from(itemMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
        
        setTopItems(sorted.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        })));
      } else {
        // Query daily item sales for short ranges
        const allDaily = await db.getAll<DailyItemSales>("dailyItemSales");
        const filtered = allDaily.filter(d => d.businessDate >= startDate && d.businessDate <= endDate);
        
        const itemMap = new Map<number, { name: string; quantity: number; revenue: number }>();
        
        filtered.forEach(item => {
          const existing = itemMap.get(item.itemId) || { name: item.itemName, quantity: 0, revenue: 0 };
          existing.quantity += item.totalQuantity;
          existing.revenue += item.totalRevenue;
          itemMap.set(item.itemId, existing);
        });
        
        const sorted = Array.from(itemMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
        
        setTopItems(sorted.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        })));
      }
    } catch (error) {
      console.error("Error loading top items:", error);
    }
  };

  const loadAttendanceReport = async (startDate: string, endDate: string, useMonthly: boolean) => {
    try {
      if (useMonthly) {
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        
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
        const filtered = allDaily.filter(d => d.date >= startDate && d.date <= endDate);
        
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-xs font-bold text-green-700 dark:text-green-400">LIGHTNING FAST</span>
          </div>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Overview</TabsTrigger>
          <TabsTrigger value="items">Top Items</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="font-medium">💵 Cash</span>
                <span className="font-black text-green-700 dark:text-green-400">
                  Rp {salesStats.paymentBreakdown.cash.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="font-medium">📱 QRIS Static</span>
                <span className="font-black text-blue-700 dark:text-blue-400">
                  Rp {salesStats.paymentBreakdown.qrisStatic.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="font-medium">💳 QRIS Dynamic</span>
                <span className="font-black text-purple-700 dark:text-purple-400">
                  Rp {salesStats.paymentBreakdown.qrisDynamic.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <span className="font-medium">🎟️ Voucher</span>
                <span className="font-black text-amber-700 dark:text-amber-400">
                  Rp {salesStats.paymentBreakdown.voucher.toLocaleString("id-ID")}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {topItems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Best Sellers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-slate-500">{item.quantity} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-600">
                          Rp {item.revenue.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <TrendingUp className="h-16 w-16 mx-auto text-slate-300" />
                <p className="text-slate-500">No sales data for this period</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
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
  );
}