import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DailyAttendance } from "@/types";
import { db } from "@/lib/db";
import { Share2 } from "lucide-react";
import { shareReportAsImage, generateExportFilename } from "@/lib/reportExportUtils";
import { useToast } from "@/hooks/use-toast";

type AttendanceTimeRange = "mtd" | "ytd";

interface AttendanceReportProps {
  language: string;
}

export function AttendanceReport({ language }: AttendanceReportProps) {
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [attendanceTimeRange, setAttendanceTimeRange] = useState<AttendanceTimeRange>("mtd");
  const [attendanceData, setAttendanceData] = useState<Array<{
    employeeName: string;
    totalHours: number;
    daysWorked: number;
    lateCount: number;
  }>>([]);

  useEffect(() => {
    loadAttendanceReport();
  }, [attendanceTimeRange]);

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

  const handleShare = async () => {
    if (!reportContainerRef.current) return;

    const filename = generateExportFilename("attendance-report");
    const result = await shareReportAsImage(reportContainerRef.current, {
      filename,
      title: "Attendance Report"
    });

    if (!result.success && result.error) {
      toast({
        title: "Share failed",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div ref={reportContainerRef} className="space-y-4">
      {/* Share button - absolute positioned in top right */}
      <div className="fixed top-4 right-4 z-50 md:absolute md:top-2 md:right-2">
        <Button
          onClick={handleShare}
          size="sm"
          variant="default"
          className="h-8 w-8 p-0 rounded-full shadow-lg"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

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
    </div>
  );
}