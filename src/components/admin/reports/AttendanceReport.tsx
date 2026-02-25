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
import { X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
    // Silently ignore click if details not available
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

  const exportToPDF = async () => {
    if (attendanceData.length === 0) return;

    const monthName = getMonthName(selectedMonth);
    
    // Auto-select orientation based on employee count
    // <=15 employees: landscape (fewer rows, show columns wider)
    // >15 employees: portrait (more rows need vertical space)
    const usePortrait = attendanceData.length > 15;
    const orientation = usePortrait ? "portrait" : "landscape";
    
    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Report", pageWidth / 2, margin, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${monthName} ${selectedYear}`, pageWidth / 2, margin + 8, { align: "center" });

    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
      pageWidth / 2,
      margin + 14,
      { align: "center" }
    );
    doc.setTextColor(0);

    // Table data
    const tableData = attendanceData.map((record) => {
      const avgHours = record.daysWorked > 0 ? record.totalHours / record.daysWorked : 0;
      return [
        record.employeeName,
        record.daysWorked.toString(),
        formatHoursMinutes(avgHours),
        formatHoursMinutes(record.totalHours),
        record.lateCount > 0 ? record.lateCount.toString() : "-",
        record.totalLateMinutes && record.totalLateMinutes > 0 ? record.totalLateMinutes.toString() : "-",
        record.earlyLeaveCount && record.earlyLeaveCount > 0 ? record.earlyLeaveCount.toString() : "-",
        record.totalEarlyLeaveMinutes && record.totalEarlyLeaveMinutes > 0 ? record.totalEarlyLeaveMinutes.toString() : "-",
      ];
    });

    // Calculate column widths to fit page (auto-fit)
    // Name column gets more space, others are equal
    const numericColWidth = contentWidth * 0.1; // 10% each for 7 numeric columns = 70%
    const nameColWidth = contentWidth - (numericColWidth * 7); // Remaining 30% for name

    // Generate table with auto-fit columns
    autoTable(doc, {
      startY: margin + 20,
      head: [[
        "Employee Name",
        "Days",
        "Avg Hrs",
        "Total Hrs",
        "Late",
        "Late Min",
        "Early",
        "Early Min",
      ]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        valign: "middle",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: nameColWidth },
        1: { halign: "center", cellWidth: numericColWidth },
        2: { halign: "center", cellWidth: numericColWidth },
        3: { halign: "center", cellWidth: numericColWidth },
        4: { halign: "center", cellWidth: numericColWidth },
        5: { halign: "center", cellWidth: numericColWidth },
        6: { halign: "center", cellWidth: numericColWidth },
        7: { halign: "center", cellWidth: numericColWidth },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      didParseCell: (data) => {
        // Color late counts/minutes in red
        if (data.section === "body") {
          const value = data.cell.raw as string;
          if ((data.column.index === 4 || data.column.index === 5) && value !== "-") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
          // Color early leave in orange
          if ((data.column.index === 6 || data.column.index === 7) && value !== "-") {
            data.cell.styles.textColor = [234, 88, 12];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page 1 of 1`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Download
    doc.save(`attendance-${yearMonth}.pdf`);
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center justify-end">
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

        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          disabled={attendanceData.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
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
                            : ""
                        }`}
                        onClick={() => openAttendanceCard(record.employeeId, record.employeeName)}
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
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0 [&>button]:hidden">
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
                {/* Table Header - solid background */}
                <div className="grid grid-cols-[70px_1fr_1fr_1fr] gap-0 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted sticky top-0 z-10">
                  <div>Date</div>
                  <div className="text-center">In</div>
                  <div className="text-center">Out</div>
                  <div className="text-right">Hours</div>
                </div>

                {/* Records */}
                {selectedCard.dailyRecords.map((record) => {
                  const day = new Date(record.date).getDate();
                  const dayOfWeek = new Date(record.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const isLate = record.isLate;
                  const isEarlyLeave = record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0;

                  return (
                    <div
                      key={record.id || record.date}
                      className="grid grid-cols-[70px_1fr_1fr_1fr] gap-0 px-4 py-2.5 text-sm border-b border-muted/30 bg-background"
                    >
                      <div className="font-medium">
                        {day} {dayOfWeek}
                      </div>
                      <div className={`text-center ${isLate ? "text-red-500 font-semibold" : ""}`}>
                        {formatTime(record.clockIn)}
                        {isLate && record.lateMinutes && (
                          <span className="text-[10px] ml-0.5">+{record.lateMinutes}m</span>
                        )}
                      </div>
                      <div className={`text-center ${isEarlyLeave ? "text-red-500 font-semibold" : ""}`}>
                        {formatTime(record.clockOut)}
                        {isEarlyLeave && (
                          <span className="text-[10px] ml-0.5">-{record.earlyLeaveMinutes}m</span>
                        )}
                      </div>
                      <div className="text-right text-xs flex items-center justify-end">
                        {formatHoursMinutes(record.hoursWorked)}
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