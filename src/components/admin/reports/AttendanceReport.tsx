import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonthlyAttendanceSummary, DailyAttendance } from "@/types";
import { db } from "@/lib/db";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceReportProps {
  language: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface AttendanceCardData {
  employeeId: number;
  employeeName: string;
  yearMonth: string;
  dailyRecords: DailyAttendance[];
}

export function AttendanceReport({ language, containerRef }: AttendanceReportProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AttendanceCardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Calculate if selected month is within 60-day window (details available)
  const isDetailsAvailable = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    // Details available if the selected month's last day is within 60 days
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
    return lastDayOfMonth >= cutoffDate;
  }, [selectedYear, selectedMonth]);

  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Generate month options
  const monthOptions = useMemo(() => {
    return [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ];
  }, []);

  const yearMonth = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadAttendanceReport();
  }, [yearMonth]);

  const loadAttendanceReport = async () => {
    setLoading(true);
    try {
      // Try to get from monthly summaries first
      const allMonthlySummaries = await db.getAll<MonthlyAttendanceSummary>("monthlyAttendanceSummary");
      const filteredSummaries = allMonthlySummaries.filter(s => s.yearMonth === yearMonth);

      if (filteredSummaries.length > 0) {
        setAttendanceData(filteredSummaries);
      } else {
        // Fall back to computing from dailyAttendance for current/recent months
        const allDaily = await db.getAll<DailyAttendance>("dailyAttendance");
        const filtered = allDaily.filter(d => d.date.startsWith(yearMonth));

        const employeeMap = new Map<number, {
          employeeId: number;
          employeeName: string;
          totalHours: number;
          daysWorked: number;
          lateCount: number;
          totalLateMinutes: number;
        }>();

        filtered.forEach(record => {
          const existing = employeeMap.get(record.employeeId) || {
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            totalHours: 0,
            daysWorked: 0,
            lateCount: 0,
            totalLateMinutes: 0,
          };
          existing.totalHours += record.hoursWorked;
          existing.daysWorked += 1;
          if (record.isLate) existing.lateCount += 1;
          if (record.lateMinutes) existing.totalLateMinutes += record.lateMinutes;
          employeeMap.set(record.employeeId, existing);
        });

        const summaries: MonthlyAttendanceSummary[] = Array.from(employeeMap.values()).map(e => ({
          employeeId: e.employeeId,
          employeeName: e.employeeName,
          yearMonth: yearMonth,
          totalHours: e.totalHours,
          daysWorked: e.daysWorked,
          lateCount: e.lateCount,
          totalLateMinutes: e.totalLateMinutes,
        }));

        setAttendanceData(summaries);
      }
    } catch (error) {
      console.error("Error loading attendance report:", error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceCard = async (employeeId: number, employeeName: string) => {
    if (!isDetailsAvailable) return;

    setCardLoading(true);
    setCardModalOpen(true);

    try {
      const allDaily = await db.getAll<DailyAttendance>("dailyAttendance");
      const filtered = allDaily
        .filter(d => d.employeeId === employeeId && d.date.startsWith(yearMonth))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSelectedCard({
        employeeId,
        employeeName,
        yearMonth,
        dailyRecords: filtered,
      });
    } catch (error) {
      console.error("Error loading attendance card:", error);
      setSelectedCard(null);
    } finally {
      setCardLoading(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(1);
  };

  const formatLateHours = (minutes: number | undefined): string => {
    if (!minutes || minutes === 0) return "-";
    const hours = minutes / 60;
    return hours.toFixed(1);
  };

  const getMonthName = (month: number): string => {
    return monthOptions.find(m => m.value === month)?.label || "";
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 justify-end">
        <Select
          value={String(selectedYear)}
          onValueChange={(val) => setSelectedYear(Number(val))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedMonth)}
          onValueChange={(val) => setSelectedMonth(Number(val))}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : attendanceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium sticky left-0 bg-muted/50 z-10 min-w-[150px]">
                      Name
                    </th>
                    <th className="text-right py-3 px-4 font-medium min-w-[70px]">Days</th>
                    <th className="text-right py-3 px-4 font-medium min-w-[90px]">Avg. Hours</th>
                    <th className="text-right py-3 px-4 font-medium min-w-[100px]">Total Hours</th>
                    <th className="text-right py-3 px-4 font-medium min-w-[70px]">Late</th>
                    <th className="text-right py-3 px-4 font-medium min-w-[90px]">Late Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record) => {
                    const avgHours = record.daysWorked > 0
                      ? record.totalHours / record.daysWorked
                      : 0;
                    const canTap = isDetailsAvailable;

                    return (
                      <tr
                        key={record.employeeId}
                        className={`border-b transition-colors ${
                          canTap
                            ? "hover:bg-muted/30 cursor-pointer"
                            : "opacity-60 cursor-default"
                        }`}
                        onClick={() => canTap && openAttendanceCard(record.employeeId, record.employeeName)}
                      >
                        <td className="py-3 px-4 sticky left-0 bg-background z-10 font-medium">
                          {record.employeeName}
                        </td>
                        <td className="text-right py-3 px-4">{record.daysWorked}</td>
                        <td className="text-right py-3 px-4">{formatHours(avgHours)}h</td>
                        <td className="text-right py-3 px-4">{formatHours(record.totalHours)}h</td>
                        <td className="text-right py-3 px-4">
                          {record.lateCount > 0 ? (
                            <span className="text-red-500">{record.lateCount}×</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-right py-3 px-4">
                          {record.totalLateMinutes && record.totalLateMinutes > 0 ? (
                            <span className="text-red-500">
                              {formatLateHours(record.totalLateMinutes)}h
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No attendance data for {getMonthName(selectedMonth)} {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Card Modal */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {selectedCard?.employeeName} - {getMonthName(selectedMonth)} {selectedYear}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCardModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {cardLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : selectedCard && selectedCard.dailyRecords.length > 0 ? (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-5 gap-2 py-2 px-3 bg-muted/50 rounded text-xs font-medium text-muted-foreground sticky top-0">
                  <div>Date</div>
                  <div className="text-center">In</div>
                  <div className="text-center">Out</div>
                  <div className="text-right">Hours</div>
                  <div className="text-right">Status</div>
                </div>

                {/* Records */}
                {selectedCard.dailyRecords.map((record) => {
                  const day = new Date(record.date).getDate();
                  const dayOfWeek = new Date(record.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const hasIssue = record.isLate || (record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0);

                  return (
                    <div
                      key={record.id || record.date}
                      className={`grid grid-cols-5 gap-2 py-2 px-3 rounded text-sm ${
                        hasIssue ? "bg-red-50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <div className="font-medium">
                        {day} {dayOfWeek}
                      </div>
                      <div className={`text-center ${record.isLate ? "text-red-500 font-medium" : ""}`}>
                        {formatTime(record.clockIn)}
                      </div>
                      <div className={`text-center ${record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 ? "text-red-500 font-medium" : ""}`}>
                        {formatTime(record.clockOut)}
                      </div>
                      <div className="text-right">
                        {formatHours(record.hoursWorked)}h
                      </div>
                      <div className="text-right text-xs">
                        {record.isLate && record.lateMinutes ? (
                          <span className="text-red-500">Late {record.lateMinutes}m</span>
                        ) : record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 ? (
                          <span className="text-red-500">Early {record.earlyLeaveMinutes}m</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No daily records found for this month
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {selectedCard && selectedCard.dailyRecords.length > 0 && (
            <div className="flex-shrink-0 border-t pt-3 mt-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Days</div>
                  <div className="font-semibold">{selectedCard.dailyRecords.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Total Hours</div>
                  <div className="font-semibold">
                    {formatHours(selectedCard.dailyRecords.reduce((sum, r) => sum + r.hoursWorked, 0))}h
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Late Count</div>
                  <div className="font-semibold text-red-500">
                    {selectedCard.dailyRecords.filter(r => r.isLate).length}×
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}