import { useState, useRef, useEffect } from "react";
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
import { executeQuery } from "@/lib/chatbot-interpreter";
import { Language } from "@/types";
import { PieChart } from "@/components/charts/PieChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { Card, CardContent } from "@/components/ui/card";
import type { QueryResult } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  chartType?: "pie" | "bar" | "line" | "card" | "table" | "heatmap" | "stacked_bar" | "horizontal_bar";
}

interface ReportsPanelProps {
  language: Language;
}

export function ReportsPanel({ language }: ReportsPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Helper: Add artificial delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper: Stream text line by line
  const streamResponse = async (
    text: string,
    data?: any,
    chartType?: "pie" | "bar" | "line" | "card" | "table" | "heatmap" | "stacked_bar" | "horizontal_bar"
  ) => {
    setIsStreaming(true);
    setStreamingText("");

    // Thinking delay: 1-2 seconds (feels more natural)
    await delay(1000 + Math.random() * 1000);

    // Split into lines and stream one by one
    const lines = text.split("\n");
    let accumulated = "";

    for (let i = 0; i < lines.length; i++) {
      accumulated += (i > 0 ? "\n" : "") + lines[i];
      setStreamingText(accumulated);
      // Slower delay: 100-200ms per line (more readable)
      await delay(100 + Math.random() * 100);
    }

    // Complete streaming
    setIsStreaming(false);
    setStreamingText("");
    setMessages(prev => [...prev, {
      role: "assistant",
      content: text,
      data,
      chartType
    }]);
  };

  const renderChart = (type: string, data: any) => {
    switch (type) {
      case "pie":
        return (
          <div className="h-[300px] w-full mt-4">
            <PieChart data={data} />
          </div>
        );
      case "bar":
      case "horizontal_bar":
        return (
          <div className="h-[300px] w-full mt-4">
            <HorizontalBarChart data={data} />
          </div>
        );
      case "line":
        return (
          <div className="h-[300px] w-full mt-4">
            <LineChart data={data} />
          </div>
        );
      case "heatmap":
        return (
          <div className="h-[300px] w-full mt-4">
            <Heatmap data={data} />
          </div>
        );
      case "stacked_bar":
        return (
          <div className="h-[300px] w-full mt-4">
            <StackedBarChart data={data} />
          </div>
        );
      case "card":
        // Single value card
        return null; // Usually handled in text, but could be a visual card
      default:
        return null;
    }
  };

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
        await streamResponse(helpResponse);
        setIsProcessing(false);
        return;
      }

      // Parse query
      const parsedQuery = parseQuery(userMessage);
      
      // Execute query
      const result = await executeQuery(parsedQuery);

      if (result.type !== "error") {
        await streamResponse(
          result.text || "Query executed successfully",
          result.data,
          result.chartType
        );
      } else {
        await streamResponse(
          `❌ **Error:** ${result.text || result.error}\n\nTry asking a different question or type **HELP** for examples.`
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      await streamResponse(
        "❌ **Error:** Something went wrong processing your query. Please try again or type **HELP** for examples."
      );
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

      <TabsContent value="sales" className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
        <SalesReport language={language} />
      </TabsContent>

      <TabsContent value="items" className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
        <ItemsReport language={language} />
      </TabsContent>

      <TabsContent value="attendance" className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
        <AttendanceReport language={language} />
      </TabsContent>

      <TabsContent 
        value="ask" 
        className="flex flex-col h-[calc(100vh-120px)] min-h-[500px] mt-4"
      >
        {/* Chat Messages Container - Takes remaining space */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            /* Welcome Screen - Centered */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">How can I help you?</h2>
              <p className="text-muted-foreground max-w-md">
                I can analyze your sales, transactions, items, and more. Try asking about "revenue today" or "top selling items".
              </p>
            </div>
          ) : (
            /* Chat Messages List */
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-12"
                        : "bg-muted/50 border mr-12"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="space-y-3">
                        {message.content.split("\n").map((line, i) => (
                          <p key={i} className="leading-relaxed whitespace-pre-wrap">
                            {line}
                          </p>
                        ))}
                        {message.chartType && message.data && renderChart(message.chartType, message.data)}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl p-4 bg-muted/50 border mr-12 shadow-sm">
                    <div className="space-y-3">
                      {streamingText.split("\n").map((line, i) => (
                        <p key={i} className="leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300 whitespace-pre-wrap">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking indicator */}
              {isProcessing && !isStreaming && (
                <div className="flex justify-start">
                  <div className="rounded-2xl p-4 bg-muted/50 border shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground ml-1">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Invisible element to scroll to */}
              <div ref={chatEndRef} className="h-px w-full" />
            </div>
          )}
        </div>

        {/* Chat Input - Sticky at bottom */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="relative max-w-4xl mx-auto flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your data..."
              className="min-h-[50px] max-h-[150px] resize-none rounded-xl text-base py-3 px-4 flex-1 shadow-sm focus-visible:ring-1"
              rows={1}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isProcessing}
              size="icon"
              className="h-[50px] w-[50px] rounded-xl shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI can make mistakes. Please double check the data.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}