import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { SalesReport } from "./reports/SalesReport";
import { ItemsReport } from "./reports/ItemsReport";
import { AttendanceReport } from "./reports/AttendanceReport";
import { MoreVertical, FileDown, Image, FileText, Printer, Send } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ReportsPanel() {
  const { language } = useApp();
  const [activeTab, setActiveTab] = useState("sales");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleExportPDF = () => {
    console.log("Exporting as PDF");
  };

  const handleExportImage = () => {
    console.log("Exporting as Image");
  };

  const handleExportCSV = () => {
    console.log("Exporting as CSV");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    };

    setChatMessages([...chatMessages, userMessage]);
    setChatInput("");

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "AI response functionality coming soon. Your query: " + userMessage.content,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="ask-me">Ask Me</TabsTrigger>
        </TabsList>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportImage}>
              <Image className="mr-2 h-4 w-4" />
              Export as Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileText className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TabsContent value="sales" className="space-y-4">
        <SalesReport language={language} />
      </TabsContent>

      <TabsContent value="items" className="space-y-4">
        <ItemsReport language={language} />
      </TabsContent>

      <TabsContent value="attendance" className="space-y-4">
        <AttendanceReport language={language} />
      </TabsContent>

      <TabsContent value="ask-me" className="h-[calc(100vh-12rem)]">
        <div className="flex flex-col h-full">
          {chatMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center space-y-6 max-w-2xl px-4">
                <h2 className="text-4xl font-semibold text-foreground">
                  How can I help you today?
                </h2>
                <p className="text-muted-foreground text-lg">
                  Ask for any specific report, or HELP for more
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sticky bottom-0 pt-4">
            <div className="relative max-w-4xl mx-auto">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AI Assistant..."
                className="min-h-[56px] max-h-[200px] pr-12 resize-none rounded-3xl bg-muted border-muted-foreground/20"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                disabled={!chatInput.trim()}
                className="absolute right-2 bottom-2 h-10 w-10 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}