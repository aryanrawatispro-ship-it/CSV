"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileUpload } from "@/components/chat/file-upload";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { DataTable } from "@/components/data/data-table";
import { ChartView } from "@/components/data/chart-view";
import { ChatMessage as ChatMessageType, UploadResponse } from "@/lib/types";
import {
  FileSpreadsheet,
  ArrowLeft,
  Database,
  Loader2,
} from "lucide-react";
import { generateId } from "@/lib/utils";

export default function AppPage() {
  const [dataset, setDataset] = useState<UploadResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    result: any;
    chart?: any;
    sql?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUploadComplete = (data: UploadResponse) => {
    setDataset(data);
    setMessages([
      {
        id: generateId(),
        role: "assistant",
        content: `I've loaded your file "${data.filename}". I can see ${
          data.schema.tables[0]?.row_count || 0
        } rows with ${
          data.schema.tables[0]?.columns.length || 0
        } columns. What would you like to know about your data?`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendMessage = async (content: string) => {
    if (!dataset) return;

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const assistantMessage: ChatMessageType = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setCurrentResult(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetId: dataset.datasetId,
          messages: [
            ...messages.filter((m) => !m.streaming),
            { role: "user", content },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "token") {
                accumulatedContent += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = accumulatedContent;
                  }
                  return newMessages;
                });
              } else if (data.type === "result") {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = data.summary;
                    lastMessage.sql = data.sql;
                    lastMessage.result = data.result;
                    lastMessage.chart = data.chart;
                    lastMessage.streaming = false;
                  }
                  return newMessages;
                });

                setCurrentResult({
                  result: data.result,
                  chart: data.chart,
                  sql: data.sql,
                });
              } else if (data.type === "error") {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = `Error: ${data.error}`;
                    lastMessage.streaming = false;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content =
            "Sorry, I encountered an error. Please try again.";
          lastMessage.streaming = false;
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Chat with CSV</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataset && (
              <Badge variant="secondary" className="gap-2">
                <Database className="h-3 w-3" />
                {dataset.filename}
              </Badge>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 flex gap-6">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!dataset ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md w-full">
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Upload Your Data
                </h2>
                <FileUpload onUploadComplete={handleUploadComplete} />
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t pt-4">
                <ChatInput onSend={handleSendMessage} disabled={isLoading} />
              </div>
            </>
          )}
        </div>

        {/* Results Panel */}
        {dataset && (
          <div className="w-[600px] flex-shrink-0 space-y-4 overflow-y-auto">
            {/* Schema Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dataset Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Rows:</span>{" "}
                  {dataset.schema.tables[0]?.row_count.toLocaleString() || 0}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Columns:</span>{" "}
                  {dataset.schema.tables[0]?.columns.length || 0}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Fields:</div>
                  <div className="flex flex-wrap gap-1">
                    {dataset.schema.tables[0]?.columns.map((col) => (
                      <Badge key={col.name} variant="outline" className="text-xs">
                        {col.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {isLoading && !currentResult && (
              <Card>
                <CardContent className="p-8 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing your question...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentResult && (
              <>
                {currentResult.chart &&
                  currentResult.chart.type !== "none" && (
                    <ChartView
                      chart={currentResult.chart}
                      result={currentResult.result}
                    />
                  )}
                <DataTable
                  result={currentResult.result}
                  datasetId={dataset.datasetId}
                  sql={currentResult.sql}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
