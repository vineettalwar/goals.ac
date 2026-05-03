import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RoadmapChatProps {
  slug: string;
}

export function RoadmapChat({ slug }: RoadmapChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I can answer questions about this roadmap — tactics, priorities, how to adapt it to your situation. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/roadmaps/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: conversationId ?? undefined }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json() as { reply: string; conversationId: number };
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't get a response. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-4 md:right-8 z-50 w-[min(380px,calc(100vw-2rem))] flex flex-col rounded-2xl border border-border bg-background shadow-xl overflow-hidden"
            style={{ maxHeight: "min(520px, calc(100vh - 140px))" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Roadmap Assistant</p>
                  <p className="text-xs text-muted-foreground">Ask anything about this strategy</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-blue-600"
                      : "bg-muted border border-border"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5 text-white" />
                      : <Bot className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-xl px-3 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 pb-3 pt-2 border-t border-border">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about tactics, priorities, KPIs…"
                  className="resize-none text-sm min-h-[40px] max-h-[120px] py-2.5"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-4 md:right-8 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors ${
          open
            ? "bg-zinc-700 hover:bg-zinc-600"
            : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        }`}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        {open ? (
          <>
            <ChevronDown className="w-4 h-4" />
            Close
          </>
        ) : (
          <>
            <MessageCircle className="w-4 h-4" />
            Ask AI
          </>
        )}
      </motion.button>
    </>
  );
}
