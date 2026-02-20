import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpFromLine, Printer, Send } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";
import { parseQuery } from "@/lib/chatbot-parser";
import { getHelpResponse, getQuickExamples } from "@/lib/chatbot-help";
import { executeQuery, QueryResult } from "@/lib/chatbot-interpreter";
import { Language } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  chartType?: QueryResult["chartType"];
}

interface ReportsPanelProps {
  language: Language;
}

export function ReportsPanel({ language }: ReportsPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const quickExamples = getQuickExamples();

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setIsProcessing(true);

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      // Check for HELP command
      if (userMessage.toLowerCase().match(/^(help|what can you do|commands|guide|show commands|what commands)$/)) {
        const helpResponse = getHelpResponse();
        setMessages(prev => [...prev, { role: "assistant", content: helpResponse }]);
        setIsProcessing(false);
        return;
      }

      // Parse query
      const parsedQuery = parseQuery(userMessage);
      
      // Execute query
      const result = await executeQuery(parsedQuery);

      if (result.success) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: result.responseText || "Query executed successfully",
          data: result.data,
          chartType: result.chartType
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `❌ **Error:** ${result.error}\n\nTry asking a different question or type **HELP** for examples.`
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ **Error:** Something went wrong processing your query. Please try again or type **HELP** for examples."
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickExample = (example: string) => {
    setChatInput(example);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: Message, index: number) => {
    return (
      <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
        <div
          className={`inline-block max-w-[80%] p-3 rounded-lg ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          {message.role === "assistant" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {message.content.split("\n").map((line, i) => {
                if (line.startsWith("# ")) {
                  return <h1 key={i} className="text-lg font-bold mt-2 mb-1">{line.substring(2)}</h1>;
                } else if (line.startsWith("## ")) {
                  return <h2 key={i} className="text-base font-bold mt-2 mb-1">{line.substring(3)}</h2>;
                } else if (line.startsWith("### ")) {
                  return <h3 key={i} className="text-sm font-bold mt-1 mb-1">{line.substring(4)}</h3>;
                } else if (line.startsWith("**") && line.endsWith("**")) {
                  return <p key={i} className="font-bold my-1">{line.slice(2, -2)}</p>;
                } else if (line.startsWith("- ")) {
                  return <li key={i} className="ml-4">{line.substring(2)}</li>;
                } else if (line.trim() === "") {
                  return <br key={i} />;
                } else {
                  return <p key={i} className="my-1">{line}</p>;
                }
              })}
            </div>
          )}
          {message.role === "user" && <p>{message.content}</p>}
        </div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="sales" className="w-full">
      <div className="flex flex-col gap-4">
        {/* Row 1: Tabs + Export + Print */}
        <div className="flex items-center justify-between gap-4">
          <TabsList className="flex-1">
            <TabsTrigger value="sales" className="flex-1">Sales</TabsTrigger>
            <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
            <TabsTrigger value="ask" className="flex-1">Ask Me</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpFromLine className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Image</DropdownMenuItem>
                <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <TabsContent value="sales" className="mt-4">
        <SalesReport language={language} />
      </TabsContent>

      <TabsContent value="items" className="mt-4">
        <ItemsReport language={language} />
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <AttendanceReport language={language} />
      </TabsContent>

      <TabsContent value="ask" className="mt-4">
        <div className="space-y-4">
          {/* Chat Messages */}
          <div className="border rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto bg-background">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">👋 Ask me anything about your reports!</h3>
                  <p className="text-sm text-muted-foreground">
                    I can help you analyze sales, items, attendance, and more.
                  </p>
                </div>

                <div className="space-y-2 w-full max-w-2xl">
                  <p className="text-xs text-muted-foreground font-medium">Quick Examples:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickExamples.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2 px-3"
                        onClick={() => handleQuickExample(example)}
                      >
                        <span className="text-xs">{example}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Type <strong>HELP</strong> to see all available queries
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message, index) => renderMessage(message, index))}
                {isProcessing && (
                  <div className="text-left">
                    <div className="inline-block bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your reports... (e.g., 'What was revenue today?')"
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isProcessing}
              size="icon"
              className="h-[44px] w-[44px] shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}