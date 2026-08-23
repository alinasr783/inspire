"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, X, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendAssistantMessage } from "@/lib/assistant/actions";
import type { ChatHistoryEntry } from "@/lib/assistant/chat";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; summary: string; ok: boolean }[];
};

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");

    const history: ChatHistoryEntry[] = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setPending(true);

    try {
      const result = await sendAssistantMessage({ message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          actions: result.actions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "حدث خطأ في الاتصال بالمساعد، حاول مجددًا. | An error occurred, please try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button
        size="icon-lg"
        onClick={() => setOpen(true)}
        aria-label="المساعد الذكي"
        className="fixed bottom-24 end-4 z-50 size-14 rounded-full shadow-xl"
      >
        <Bot className="size-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-24 end-4 z-50 flex h-[min(560px,calc(100dvh-8rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">المساعد الذكي | AI Assistant</p>
            <p className="text-[11px] text-muted-foreground">وصول مباشر لبيانات النظام</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="إغلاق">
          <X className="size-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            اسألني عن العقارات والعملاء، وأنا أنفذ لك كل العمليات مباشرة — بحثًا وجلبًا وإنشاءً وتعديلًا وحذفًا.
            <br />
            <span className="mt-1 inline-block">مثال: «اعرض لي عقارات في الشيخ زايد سعرها أقل من مليونين»</span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border bg-card text-card-foreground"
              }`}
            >
              {m.content}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {m.actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <Wrench className={`mt-0.5 size-3 shrink-0 ${a.ok ? "text-emerald-500" : "text-destructive"}`} />
                      <span className={a.ok ? "text-muted-foreground" : "text-destructive"}>{a.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جارٍ التنفيذ...
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="اكتب رسالتك هنا..."
          rows={1}
          className="max-h-28 min-h-9 flex-1 resize-none text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={pending || !input.trim()} aria-label="إرسال">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
