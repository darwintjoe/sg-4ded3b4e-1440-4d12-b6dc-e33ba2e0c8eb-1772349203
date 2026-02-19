import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { ArrowUpFromLine, Printer, FileText, Image as ImageIcon } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";
import { translate } from "@/lib/translations";

export function ReportsPanel() {
  const { language } = useApp();

  const exportToCSV = () => {
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

  const exportToPDF = () => {
    console.log("Export to PDF");
  };

  const exportToImage = () => {
    console.log("Export to Image");
  };

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b">
        {/* Row 1: Tabs */}
        <div className="px-4 py-3 flex items-center justify-center">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="sales">{translate("reports.tabs.sales", language)}</TabsTrigger>
            <TabsTrigger value="items">{translate("reports.tabs.items", language)}</TabsTrigger>
            <TabsTrigger value="attendance">{translate("reports.tabs.attendance", language)}</TabsTrigger>
          </TabsList>
        </div>

        {/* Row 2: Export Buttons */}
        <div className="px-4 py-3 flex items-center justify-center gap-2 border-t bg-muted/30">
          <Button onClick={exportToPDF} variant="outline" size="sm" className="flex-1 max-w-[180px]">
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToImage} variant="outline" size="sm" className="flex-1 max-w-[180px]">
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            Export Image
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="flex-1 max-w-[180px]">
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm" className="flex-1 max-w-[180px]">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0 md:p-4">
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