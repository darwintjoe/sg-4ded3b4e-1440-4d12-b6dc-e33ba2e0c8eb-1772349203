import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { Download, Printer } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";

export function ReportsPanel() {
  const { language } = useApp();

  const exportToCSV = () => {
    // This is a placeholder - full implementation would aggregate data from all reports
    const csv = "SELL MORE - Report Export\n";
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

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto p-4">
        <TabsContent value="sales" className="mt-0">
          <SalesReport language={language} />
        </TabsContent>

        <TabsContent value="items" className="mt-0">
          <ItemsReport language={language} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-0">
          <AttendanceReport language={language} />
        </TabsContent>
      </div>
    </Tabs>
  );
}