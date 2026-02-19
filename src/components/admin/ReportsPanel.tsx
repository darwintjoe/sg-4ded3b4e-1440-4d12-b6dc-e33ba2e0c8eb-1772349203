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
import { parseQuery } from "@/lib/chatbot-parser";
import { formatHelpResponse, getQuickExamples } from "@/lib/chatbot-help";

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
      const parsedQuery = parseQuery(userMessage.content);
      let assistantResponse = "";

      if (parsedQuery.intent === "help") {
        assistantResponse = formatHelpResponse();
      } else if (parsedQuery.intent === "unknown") {
        assistantResponse = "I'm not sure I understand that query. Type **HELP** to see what I can do!\n\nHere are some quick examples:\n\n" + 
          getQuickExamples().map(ex => `• ${ex}`).join("\n");
      } else {
        assistantResponse = `🔍 Query detected: **${parsedQuery.intent.replace("_", " ")}**\n\nTime range: ${parsedQuery.timeRange.type}\n\n_Full implementation coming soon..._\n\nFor now, try:\n• **HELP** - See all available commands\n• Use the tabs above for detailed reports`;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantResponse,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    }, 300);
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
                  Ask for any specific report, or type <strong>HELP</strong> for examples
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                  {getQuickExamples().map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setChatInput(example);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                      className="text-left p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                    >
                      <p className="text-sm text-foreground">{example}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                      {message.content.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) {
                          return <h1 key={i} className="text-lg font-bold mt-2 mb-2">{line.substring(2)}</h1>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-base font-semibold mt-3 mb-1">{line.substring(3)}</h2>;
                        }
                        if (line.startsWith('• ')) {
                          return <li key={i} className="ml-4">{line.substring(2)}</li>;
                        }
                        if (line.startsWith('---')) {
                          return <hr key={i} className="my-3 border-t border-border" />;
                        }
                        if (line.match(/^\*\*(.+)\*\*$/)) {
                          return <p key={i} className="font-semibold mt-2">{line.replace(/\*\*/g, '')}</p>;
                        }
                        return line ? <p key={i}>{line}</p> : <br key={i} />;
                      })}
                    </div>
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