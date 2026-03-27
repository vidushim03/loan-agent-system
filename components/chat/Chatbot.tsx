"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

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
  const [conversationState, setConversationState] = useState<ConversationState>(initialState);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, conversationState }),
      });

      const data = await res.json();
      const responseText = data?.response || data?.error || "Sorry, something went wrong.";

      setMessages((prev) => [...prev, { sender: "agent", text: responseText }]);

      if (data?.updated_state) {
        setConversationState(data.updated_state as ConversationState);
      }
    } catch {
      setMessages((prev) => [...prev, { sender: "agent", text: "Error: unable to reach the AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex h-[calc(100vh-9rem)] w-full flex-col border border-border shadow-sm bg-card">
      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
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
          </div>
          <div ref={scrollRef} />
        </ScrollArea>

        <Separator />

        <div className="flex items-center gap-2 p-3 border-t bg-background">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
