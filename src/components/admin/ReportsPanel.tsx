import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/contexts/AppContext";
import { ArrowUpFromLine, Printer, Send } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";
import { translate } from "@/lib/translations";
import { useState } from "react";

export function ReportsPanel() {
  const { language } = useApp();
  const [query, setQuery] = useState("");

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

  const handleQuerySubmit = () => {
    if (!query.trim()) return;
    console.log("AI Query:", query);
    setQuery("");
  };

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b">
        {/* Row 1: Tabs + Export Dropdown + Print Button */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <TabsList className="grid grid-cols-3 flex-1 max-w-md">
            <TabsTrigger value="sales">{translate("reports.tabs.sales", language)}</TabsTrigger>
            <TabsTrigger value="items">{translate("reports.tabs.items", language)}</TabsTrigger>
            <TabsTrigger value="attendance">{translate("reports.tabs.attendance", language)}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowUpFromLine className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF}>
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToImage}>
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Export Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-9 w-9">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: AI Chat Input */}
        <div className="px-4 py-3 border-t bg-muted/30">
          <div className="relative flex items-end gap-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuerySubmit();
                }
              }}
              placeholder="Ask about your reports... (e.g., 'Show top selling items this month')"
              className="min-h-[44px] max-h-[120px] resize-none pr-12"
              rows={1}
            />
            <Button
              onClick={handleQuerySubmit}
              disabled={!query.trim()}
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
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