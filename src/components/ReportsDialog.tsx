import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { translate } from "@/lib/translations";
import { db } from "@/lib/db";
import { Transaction, AttendanceRecord } from "@/types";
import { Search, TrendingUp, Users, DollarSign, Clock } from "lucide-react";

interface ReportsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ReportsDialog({ open, onClose }: ReportsDialogProps) {
  const { language } = useApp();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const processQuery = async () => {
    setLoading(true);
    const lowerQuery = query.toLowerCase();

    try {
      // Today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = today.getTime() + 86400000;

      // Fetch all transactions
      const allTransactions = await db.getAll<Transaction>("transactions");

      // Keyword-based report generation
      if (lowerQuery.includes("today") || lowerQuery.includes("hari ini") || lowerQuery.includes("今天")) {
        const todayTransactions = allTransactions.filter(
          t => t.timestamp >= todayStart && t.timestamp < todayEnd
        );
        const total = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        setResult(`Total sales today: Rp ${total.toLocaleString()}\nReceipts: ${todayTransactions.length}`);
      } else if (lowerQuery.includes("cash") || lowerQuery.includes("tunai") || lowerQuery.includes("现金")) {
        const cashTotal = allTransactions.reduce((sum, t) => {
          const cashPayments = t.payments.filter(p => p.method === "cash");
          return sum + cashPayments.reduce((s, p) => s + p.amount, 0);
        }, 0);
        setResult(`Total cash payments: Rp ${cashTotal.toLocaleString()}`);
      } else if (lowerQuery.includes("qris")) {
        const qrisTotal = allTransactions.reduce((sum, t) => {
          const qrisPayments = t.payments.filter(p => p.method.includes("qris"));
          return sum + qrisPayments.reduce((s, p) => s + p.amount, 0);
        }, 0);
        setResult(`Total QRIS payments: Rp ${qrisTotal.toLocaleString()}`);
      } else if (lowerQuery.includes("breakdown") || lowerQuery.includes("rincian") || lowerQuery.includes("细分")) {
        const breakdown = {
          cash: 0,
          qrisStatic: 0,
          qrisDynamic: 0,
          voucher: 0
        };
        
        allTransactions.forEach(t => {
          t.payments.forEach(p => {
            if (p.method === "cash") breakdown.cash += p.amount;
            else if (p.method === "qris-static") breakdown.qrisStatic += p.amount;
            else if (p.method === "qris-dynamic") breakdown.qrisDynamic += p.amount;
            else if (p.method === "voucher") breakdown.voucher += p.amount;
          });
        });

        setResult(
          `Payment Breakdown:\n` +
          `Cash: Rp ${breakdown.cash.toLocaleString()}\n` +
          `QRIS Static: Rp ${breakdown.qrisStatic.toLocaleString()}\n` +
          `QRIS Dynamic: Rp ${breakdown.qrisDynamic.toLocaleString()}\n` +
          `Voucher: Rp ${breakdown.voucher.toLocaleString()}`
        );
      } else if (lowerQuery.includes("attendance") || lowerQuery.includes("absen") || lowerQuery.includes("考勤")) {
        const todayDate = new Date().toISOString().split("T")[0];
        const todayAttendance = await db.searchByIndex<AttendanceRecord>("attendance", "date", todayDate);
        
        const summary = todayAttendance.map(a => {
          const duration = a.clockOut ? ((a.clockOut - a.clockIn) / 3600000).toFixed(1) : "Still working";
          return `${a.employeeName}: ${duration}${typeof duration === 'string' ? '' : 'h'}`;
        }).join("\n");

        setResult(`Today's Attendance:\n${summary || "No attendance records"}`);
      } else if (lowerQuery.includes("total") || lowerQuery.includes("semua") || lowerQuery.includes("总")) {
        const total = allTransactions.reduce((sum, t) => sum + t.total, 0);
        setResult(`All-time total sales: Rp ${total.toLocaleString()}\nTotal receipts: ${allTransactions.length}`);
      } else {
        setResult("Try queries like: 'total sales today', 'cash vs QRIS breakdown', 'employee attendance'");
      }
    } catch (error) {
      setResult("Error processing query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            {translate("reports.title", language)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={translate("reports.query", language)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && processQuery()}
              className="flex-1"
            />
            <Button onClick={processQuery} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {translate("reports.examples", language)}
          </div>

          {result && (
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg whitespace-pre-wrap min-h-[150px]">
              {result}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuery("total sales today")}>
              <DollarSign className="h-4 w-4 mr-2" />
              Today's Sales
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuery("payment breakdown")}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Breakdown
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuery("employee attendance")}>
              <Users className="h-4 w-4 mr-2" />
              Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuery("cash vs qris")}>
              <Clock className="h-4 w-4 mr-2" />
              Cash vs QRIS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}