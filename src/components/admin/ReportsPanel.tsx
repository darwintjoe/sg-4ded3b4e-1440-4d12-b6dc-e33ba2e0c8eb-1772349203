import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpFromLine, Printer, Send, Sparkles } from "lucide-react";
import { SalesReport } from "@/components/admin/reports/SalesReport";
import { ItemsReport } from "@/components/admin/reports/ItemsReport";
import { AttendanceReport } from "@/components/admin/reports/AttendanceReport";
import { parseQuery } from "@/lib/chatbot-parser";
import { getHelpResponse } from "@/lib/chatbot-help";
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
          className={`inline-block max-w-[80%] p-4 rounded-2xl ${
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

      <TabsContent value="ask" className="mt-4 relative">
        {/* AI-Style Chat Interface */}
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {messages.length === 0 ? (
              /* Welcome Screen - Centered */
              <div className="flex flex-col items-center justify-center h-full">
                <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
                  {/* AI Icon */}
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  
                  {/* Heading */}
                  <h2 className="text-3xl font-semibold">How can I help you?</h2>
                  
                  {/* Hint */}
                  <p className="text-muted-foreground text-sm">
                    Ask me anything or type <strong>HELP</strong> for more
                  </p>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-4 pt-4">
                {messages.map((message, index) => renderMessage(message, index))}
                {isProcessing && (
                  <div className="text-left">
                    <div className="inline-block bg-muted p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Chat Input at Bottom */}
          <div className="border-t bg-background p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question here..."
                  className="min-h-[56px] max-h-[120px] resize-none pr-12 rounded-xl text-base"
                  rows={1}
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isProcessing}
                  size="icon"
                  className="absolute right-2 bottom-2 h-10 w-10 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ask me anything or type <strong>HELP</strong> for more
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}