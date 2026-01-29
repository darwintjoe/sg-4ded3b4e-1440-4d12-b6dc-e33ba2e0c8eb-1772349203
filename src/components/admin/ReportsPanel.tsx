import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { Transaction, AttendanceRecord } from "@/types";
import { translate } from "@/lib/translations";
import { useApp } from "@/contexts/AppContext";
import { BarChart3, Calendar, Users, DollarSign, TrendingUp, Download } from "lucide-react";

export function ReportsPanel() {
  const { language } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    const allTransactions = await db.getAll<Transaction>("transactions");
    const allAttendance = await db.getAll<AttendanceRecord>("attendance");
    
    // Filter by date
    const filtered = allTransactions.filter((t) => {
      const transDate = new Date(t.timestamp).toISOString().split("T")[0];
      return transDate === dateFilter;
    });
    
    const filteredAttendance = allAttendance.filter((a) => a.date === dateFilter);
    
    setTransactions(filtered);
    setAttendance(filteredAttendance);
  };

  const calculateSalesStats = () => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalReceipts = transactions.length;
    
    const paymentBreakdown = {
      cash: 0,
      qrisStatic: 0,
      qrisDynamic: 0,
      voucher: 0
    };

    transactions.forEach((t) => {
      t.payments.forEach((p) => {
        paymentBreakdown[p.method] += p.amount;
      });
    });

    return { totalRevenue, totalReceipts, paymentBreakdown };
  };

  const calculateAttendanceStats = () => {
    const clockedIn = attendance.filter((a) => a.clockIn && !a.clockOut).length;
    const clockedOut = attendance.filter((a) => a.clockOut).length;
    const totalHours = attendance.reduce((sum, a) => {
      if (a.clockIn && a.clockOut) {
        return sum + (a.clockOut - a.clockIn) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    return { clockedIn, clockedOut, totalHours: totalHours.toFixed(1) };
  };

  const stats = calculateSalesStats();
  const attendanceStats = calculateAttendanceStats();

  const exportToCSV = () => {
    // Simple CSV export
    let csv = "Timestamp,Employee,Total,Payment Methods\n";
    transactions.forEach((t) => {
      const methods = t.payments.map((p) => `${p.method}:${p.amount}`).join("|");
      csv += `${new Date(t.timestamp).toLocaleString()},${t.employeeName},${t.totalAmount},${methods}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${dateFilter}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sales Reports</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Reports</TabsTrigger>
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
                  Rp {stats.totalRevenue.toLocaleString("id-ID")}
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
                  {stats.totalReceipts}
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
                  Rp {stats.totalReceipts > 0 ? Math.round(stats.totalRevenue / stats.totalReceipts).toLocaleString("id-ID") : 0}
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
                  Rp {stats.paymentBreakdown.cash.toLocaleString("id-ID")}
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
                  Rp {stats.paymentBreakdown.cash.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="font-medium">📱 QRIS Static</span>
                <span className="font-black text-blue-700 dark:text-blue-400">
                  Rp {stats.paymentBreakdown.qrisStatic.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="font-medium">💳 QRIS Dynamic</span>
                <span className="font-black text-purple-700 dark:text-purple-400">
                  Rp {stats.paymentBreakdown.qrisDynamic.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <span className="font-medium">🎟️ Voucher</span>
                <span className="font-black text-amber-700 dark:text-amber-400">
                  Rp {stats.paymentBreakdown.voucher.toLocaleString("id-ID")}
                </span>
              </div>
            </CardContent>
          </Card>

          {transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.slice(0, 20).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{t.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-600">
                          Rp {t.totalAmount.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.payments.map((p) => p.method).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Clocked In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">
                  {attendanceStats.clockedIn}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Clocked Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600">
                  {attendanceStats.clockedOut}
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
                <div className="text-3xl font-black text-purple-600">
                  {attendanceStats.totalHours}h
                </div>
              </CardContent>
            </Card>
          </div>

          {attendance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendance.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{a.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          In: {new Date(a.clockIn).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {a.clockOut ? (
                          <>
                            <p className="font-medium text-blue-600">Clocked Out</p>
                            <p className="text-xs text-slate-500">
                              {new Date(a.clockOut).toLocaleTimeString()}
                            </p>
                            <p className="text-xs font-medium">
                              {((a.clockOut - a.clockIn) / (1000 * 60 * 60)).toFixed(1)}h
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-green-600">Active</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <Users className="h-16 w-16 mx-auto text-slate-300" />
                <p className="text-slate-500">No attendance records for this date</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}