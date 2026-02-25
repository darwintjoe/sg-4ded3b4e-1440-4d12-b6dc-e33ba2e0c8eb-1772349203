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

// Format hours as "XXXh YYm"
function formatHoursMinutes(totalHours: number): string {
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
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
          earlyLeaveCount: number;
          totalEarlyLeaveMinutes: number;
        }>();

        filtered.forEach(record => {
          const existing = employeeMap.get(record.employeeId) || {
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            totalHours: 0,
            daysWorked: 0,
            lateCount: 0,
            totalLateMinutes: 0,
            earlyLeaveCount: 0,
            totalEarlyLeaveMinutes: 0,
          };
          existing.totalHours += record.hoursWorked;
          existing.daysWorked += 1;
          if (record.isLate) existing.lateCount += 1;
          if (record.lateMinutes) existing.totalLateMinutes += record.lateMinutes;
          if (record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0) {
            existing.earlyLeaveCount += 1;
            existing.totalEarlyLeaveMinutes += record.earlyLeaveMinutes;
          }
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
          earlyLeaveCount: e.earlyLeaveCount,
          totalEarlyLeaveMinutes: e.totalEarlyLeaveMinutes,
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
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                      Name
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[45px]">
                      Days
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[70px]">
                      <div className="leading-tight">Avg</div>
                      <div className="leading-tight">Hours</div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[70px]">
                      <div className="leading-tight">Total</div>
                      <div className="leading-tight">Hours</div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[45px]">
                      <div className="leading-tight">Late</div>
                      <div className="leading-tight">Count</div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[50px]">
                      <div className="leading-tight">Late</div>
                      <div className="leading-tight">Min</div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[55px]">
                      <div className="leading-tight">Er Lv</div>
                      <div className="leading-tight">Count</div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[55px]">
                      <div className="leading-tight">Er Lv</div>
                      <div className="leading-tight">Min</div>
                    </th>
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
                            ? "hover:bg-muted/30 cursor-pointer active:bg-muted/50"
                            : "opacity-50 cursor-default"
                        }`}
                        onClick={() => canTap && openAttendanceCard(record.employeeId, record.employeeName)}
                      >
                        <td className="py-2.5 px-3 sticky left-0 bg-background z-10 font-medium">
                          {record.employeeName}
                        </td>
                        <td className="text-center py-2.5 px-2">{record.daysWorked}</td>
                        <td className="text-center py-2.5 px-2 text-xs">{formatHoursMinutes(avgHours)}</td>
                        <td className="text-center py-2.5 px-2 text-xs">{formatHoursMinutes(record.totalHours)}</td>
                        <td className="text-center py-2.5 px-2">
                          {record.lateCount > 0 ? (
                            <span className="text-red-500 font-medium">{record.lateCount}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {record.totalLateMinutes && record.totalLateMinutes > 0 ? (
                            <span className="text-red-500">{record.totalLateMinutes}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {record.earlyLeaveCount && record.earlyLeaveCount > 0 ? (
                            <span className="text-orange-500 font-medium">{record.earlyLeaveCount}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {record.totalEarlyLeaveMinutes && record.totalEarlyLeaveMinutes > 0 ? (
                            <span className="text-orange-500">{record.totalEarlyLeaveMinutes}</span>
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
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <DialogTitle className="text-base font-semibold">
              {selectedCard?.employeeName} - {getMonthName(selectedMonth)} {selectedYear}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCardModalOpen(false)}
              className="h-8 w-8 -mr-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {cardLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : selectedCard && selectedCard.dailyRecords.length > 0 ? (
              <div>
                {/* Table Header */}
                <div className="grid grid-cols-[55px_52px_52px_58px_1fr] gap-1 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30 sticky top-0">
                  <div>Date</div>
                  <div className="text-center">In</div>
                  <div className="text-center">Out</div>
                  <div className="text-right">Hours</div>
                  <div className="text-right pr-1">Status</div>
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
                      className={`grid grid-cols-[55px_52px_52px_58px_1fr] gap-1 px-4 py-2.5 text-sm border-b border-muted/30 ${
                        hasIssue ? "bg-red-50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <div className="font-medium">
                        {day} {dayOfWeek}
                      </div>
                      <div className={`text-center ${record.isLate ? "text-red-500 font-semibold" : ""}`}>
                        {formatTime(record.clockIn)}
                      </div>
                      <div className={`text-center ${record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 ? "text-red-500 font-semibold" : ""}`}>
                        {formatTime(record.clockOut)}
                      </div>
                      <div className="text-right text-xs">
                        {formatHoursMinutes(record.hoursWorked)}
                      </div>
                      <div className="text-right pr-1 text-xs">
                        {record.isLate && record.lateMinutes ? (
                          <span className="text-red-500">Late {record.lateMinutes}m</span>
                        ) : record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 ? (
                          <span className="text-orange-500">Early {record.earlyLeaveMinutes}m</span>
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
                No daily records found
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          {selectedCard && selectedCard.dailyRecords.length > 0 && (
            <div className="border-t px-4 py-3 bg-background shrink-0">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Days</div>
                  <div className="font-semibold">{selectedCard.dailyRecords.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Total Hours</div>
                  <div className="font-semibold text-xs">
                    {formatHoursMinutes(selectedCard.dailyRecords.reduce((sum, r) => sum + r.hoursWorked, 0))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Late</div>
                  <div className="font-semibold text-red-500">
                    {selectedCard.dailyRecords.filter(r => r.isLate).length}×
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Er Leave</div>
                  <div className="font-semibold text-orange-500">
                    {selectedCard.dailyRecords.filter(r => r.earlyLeaveMinutes && r.earlyLeaveMinutes > 0).length}×
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