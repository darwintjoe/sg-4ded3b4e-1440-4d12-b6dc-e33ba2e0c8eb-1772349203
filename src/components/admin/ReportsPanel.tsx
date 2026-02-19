import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { ArrowUpFromLine, Printer, MoreVertical, Send, MessageSquare } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";
import { translate } from "@/lib/translations";
import { useState } from "react";

export function ReportsPanel() {
  const { language } = useApp();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

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
    
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "assistant", content: "I'm analyzing your question. This AI feature will be implemented to answer questions about your reports, sales data, inventory, and attendance." }
    ]);
    
    setQuery("");
  };

  return (
    <Tabs defaultValue="sales" className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <TabsList className="grid grid-cols-4 flex-1 max-w-2xl">
            <TabsTrigger value="sales">{translate("reports.tabs.sales", language)}</TabsTrigger>
            <TabsTrigger value="items">{translate("reports.tabs.items", language)}</TabsTrigger>
            <TabsTrigger value="attendance">{translate("reports.tabs.attendance", language)}</TabsTrigger>
            <TabsTrigger value="askme">Ask Me</TabsTrigger>
          </TabsList>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
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
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        <TabsContent value="askme" className="mt-0 h-full flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-6 p-4 rounded-full bg-primary/10">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ask Me Anything</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                  Ask questions about your sales, inventory, attendance, or any other business data. 
                  I'll help you analyze and understand your reports.
                </p>
                <div className="grid gap-2 w-full max-w-md">
                  <Card 
                    className="p-3 hover:bg-accent cursor-pointer transition-colors text-left"
                    onClick={() => setQuery("Show top selling items this month")}
                  >
                    <p className="text-sm">Show top selling items this month</p>
                  </Card>
                  <Card 
                    className="p-3 hover:bg-accent cursor-pointer transition-colors text-left"
                    onClick={() => setQuery("What was my revenue yesterday?")}
                  >
                    <p className="text-sm">What was my revenue yesterday?</p>
                  </Card>
                  <Card 
                    className="p-3 hover:bg-accent cursor-pointer transition-colors text-left"
                    onClick={() => setQuery("Which items are low in stock?")}
                  >
                    <p className="text-sm">Which items are low in stock?</p>
                  </Card>
                  <Card 
                    className="p-3 hover:bg-accent cursor-pointer transition-colors text-left"
                    onClick={() => setQuery("Show employee attendance for this week")}
                  >
                    <p className="text-sm">Show employee attendance for this week</p>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-shrink-0 border-t bg-background p-4">
              <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
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
        </TabsContent>
      </div>
    </Tabs>
  );
}