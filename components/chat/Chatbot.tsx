"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle } from "lucide-react";

type Message = {
  sender: "user" | "agent";
  text: string;
};

type ConversationState = {
  application_id?: string;
  stage: string;
  loan_data: Record<string, unknown>;
  messages: unknown[];
  kyc_verified: boolean;
  credit_checked: boolean;
  conversation_summary?: string;
};

const initialState: ConversationState = {
  application_id: "demo-session-123",
  stage: "greeting",
  loan_data: {},
  messages: [],
  kyc_verified: false,
  credit_checked: false,
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "agent", text: "Welcome to FinAssist. Say hi to start your loan application." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<{ message: string; state: ConversationState } | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>(initialState);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (payload: { message: string; state: ConversationState }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: payload.message, conversationState: payload.state }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to process your request right now.");
      }

      const responseText = data?.response || "Sorry, something went wrong.";
      setMessages((prev) => [...prev, { sender: "agent", text: responseText }]);

      if (data?.updated_state) {
        setConversationState(data.updated_state as ConversationState);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reach the AI service.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const payload = { message: userText, state: conversationState };

    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setLastPayload(payload);

    await sendMessage(payload);
  };

  const handleRetry = async () => {
    if (!lastPayload || loading) return;
    await sendMessage(lastPayload);
  };

  return (
    <Card className="flex h-[calc(100vh-11rem)] w-full flex-col border border-border bg-card shadow-sm md:h-[calc(100vh-9rem)]">
      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Start by saying hello. I will guide you through PAN verification, credit checks, and underwriting.
              </div>
            ) : null}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm shadow md:max-w-[80%] ${
                    msg.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-foreground shadow">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <div className="mb-2 inline-flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Something went wrong
                </div>
                <p>{error}</p>
                <Button type="button" variant="outline" className="mt-3" onClick={handleRetry} disabled={!lastPayload || loading}>
                  Retry last message
                </Button>
              </div>
            ) : null}
          </div>
          <div ref={scrollRef} />
        </ScrollArea>

        <Separator />

        <div className="border-t bg-background p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
              maxLength={1000}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{input.length}/1000 characters</p>
        </div>
      </CardContent>
    </Card>
  );
}
