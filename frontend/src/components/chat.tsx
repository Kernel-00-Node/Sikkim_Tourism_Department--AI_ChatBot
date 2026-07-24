import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  MapPin,
  Wind,
  MountainSnow,
  Calendar,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createConversation, fetchConversation, type Message } from "@/lib/api";
import { GOVT_LOGO_SRC } from "@/config/brand";

/* ──────────────────────────────────────────────────────────────────────────
   Editorial Himalayan palette for the ChatBot.
   Hard-coded here rather than via CSS vars so the widget stays self-contained
   and matches the brand regardless of theme. These values are the *only*
   place the chat uses raw hex — every other surface inherits from tokens.
   ─────────────────────────────────────────────────────────────────────── */
const CHAT = {
  // — Surfaces —
  bg: "#F6F0E3", // warm parchment
  bgDeep: "#ECDFC8", // a touch darker — used for the input band
  surface: "#FFFFFF", // assistant / user bubble base
  border: "#D8CDB1", // sage-faint hairline
  borderStrong: "#B7A98A",

  // — Sentiment —
  assistantText: "#1B2A24", // pine ink
  userText: "#FFFFFF",
  userBubble: "#134238", // solid pine green (no gradient)
  assistantBubble: "#FDFAF2", // ivory, never pure white

  // — Interactive —
  accent: "#B07A1F", // burnt saffron — used sparingly: send icon, active dot
  accentSoft: "#EBD8B0",
  ringFocus: "rgba(19, 66, 56, 0.28)",

  // — Decorative prayer-flag strip ——
  flags: ["#1E5AA8", "#F1ECE0", "#C73E2A", "#3FA45A", "#E2B821"],
} as const;

const STARTERS = [
  {
    text: "What permits do I need for Nathula Pass?",
    icon: MapPin,
    eyebrow: "Permits",
  },
  {
    text: "When is the best time to visit Gangtok?",
    icon: Calendar,
    eyebrow: "Timing",
  },
  {
    text: "Suggest a peaceful monastery to visit.",
    icon: Wind,
    eyebrow: "Culture",
  },
  {
    text: "How do I reach Gurudongmar Lake?",
    icon: MountainSnow,
    eyebrow: "Routes",
  },
];

/* ── Format a timestamp like "9:42 AM" so threads feel real. ─────────────── */
function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/* ── The five prayer-flag colours, used as a single 2px hairline strip. ─── */
function PrayerFlagBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-[2px] w-full ${className}`} aria-hidden="true">
      {CHAT.flags.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Calm three-dot typing indicator. One subtle pulse, not a rainbow. ──── */
function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 py-0.5"
      aria-label="Assistant is responding"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: CHAT.userBubble,
            opacity: 0.35,
            animation: "chat-dot 1.4s ease-in-out infinite",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Assistant markdown renderer. Sober, readable, brand-coloured links. ── */
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="chat-markdown text-[0.95rem] leading-[1.6] space-y-2.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-[1.6]">{children}</p>,
          strong: ({ children }) => (
            <strong style={{ color: CHAT.userBubble, fontWeight: 600 }}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:opacity-80"
              style={{ color: CHAT.accent }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 marker:opacity-50">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 marker:opacity-50">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
          h1: ({ children }) => (
            <h3
              className="text-[1.02rem] mt-2.5 font-semibold tracking-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3
              className="text-[1.02rem] mt-2.5 font-semibold tracking-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4
              className="text-[0.98rem] mt-2 font-semibold"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-3 italic text-[0.9rem]"
              style={{ borderColor: CHAT.accentSoft, color: "#52635C" }}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              className="px-1.5 py-0.5 rounded text-[0.85em]"
              style={{
                background: CHAT.bgDeep,
                color: CHAT.userBubble,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {children}
            </code>
          ),
          hr: () => (
            <hr
              className="my-3 border-0 h-px"
              style={{ background: CHAT.border }}
            />
          ),
          table: ({ children }) => (
            <div
              className="overflow-x-auto my-2 rounded-md border"
              style={{ borderColor: CHAT.border }}
            >
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className="text-left font-semibold py-1.5 px-2 border-b"
              style={{
                borderColor: CHAT.border,
                background: CHAT.bgDeep,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="py-1.5 px-2 border-b"
              style={{ borderColor: CHAT.border }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ── Empty state — landing surface, no gimmicks. ────────────────────────── */
function EmptyState({
  onPick,
  compact,
}: {
  onPick: (text: string) => void;
  compact: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center mx-auto w-full animate-[chat-fade-up_500ms_ease-out_both] ${
        compact ? "max-w-md py-7 gap-5" : "max-w-xl py-12 gap-7"
      }`}
    >
      {/* Brass seal-style emblem — single accent on the page */}
      <div
        className="relative flex items-center justify-center rounded-full shadow-[0_8px_28px_-12px_rgba(19,66,56,0.35)]"
        style={{
          background: "#FFFFFF",
          border: `1px solid ${CHAT.border}`,
          padding: compact ? 8 : 11,
        }}
      >
        <img
          src={GOVT_LOGO_SRC}
          alt="Government of Sikkim"
          draggable={false}
          className={compact ? "h-9 w-9" : "h-12 w-12"}
          style={{ objectFit: "contain" }}
        />
      </div>

      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <p
          className={`font-semibold uppercase tracking-[0.18em] ${
            compact ? "text-[0.6rem]" : "text-[0.66rem]"
          }`}
          style={{ color: CHAT.accent }}
        >
          Sikkim Tourism · Civil Aviation
        </p>
        <h1
          className={
            compact ? "text-[1.5rem]" : "text-[1.9rem] sm:text-[2.1rem]"
          }
          style={{
            fontFamily: "Fraunces, serif",
            color: CHAT.assistantText,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
          }}
        >
          Ask me anything about Sikkim
        </h1>
        <p
          className={`mx-auto leading-relaxed ${
            compact ? "text-[0.83rem] max-w-[260px]" : "text-[0.95rem] max-w-md"
          }`}
          style={{ color: "#52635C" }}
        >
          Permits, monastery hours, the road to Gurudongmar, what to pack for
          Yumthang — answered from the Department's own records.
        </p>
      </div>

      {/* Suggested questions — clean list, chevron animates on hover. */}
      <div className="w-full space-y-2">
        {STARTERS.map(({ text, icon: Icon, eyebrow }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(text)}
            className="group flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left shadow-[0_1px_0_rgba(19,66,56,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_6px_18px_-10px_rgba(19,66,56,0.28)]"
            style={{ borderColor: CHAT.border }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: CHAT.bgDeep, color: CHAT.userBubble }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                style={{ color: CHAT.accent }}
              >
                {eyebrow}
              </span>
              <span
                className="block text-[0.88rem] font-medium leading-snug mt-0.5"
                style={{ color: CHAT.assistantText }}
              >
                {text}
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: CHAT.borderStrong }}
            />
          </button>
        ))}
      </div>

      <p
        className={compact ? "text-[0.7rem]" : "text-[0.74rem]"}
        style={{ color: "#7C8A83" }}
      >
        Your conversations are private — used only to keep context within this
        session.
      </p>
    </div>
  );
}

/* ── Single chat bubble. Assistant on the left, user on the right. ───────── */
function Bubble({ msg, showTime }: { msg: Message; showTime: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} animate-[chat-fade-up_280ms_ease-out_both]`}
    >
      {!isUser && (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden"
          style={{ background: "#FFFFFF", border: `1px solid ${CHAT.border}` }}
        >
          <img
            src={GOVT_LOGO_SRC}
            alt=""
            draggable={false}
            className="h-full w-full object-contain p-0.5"
          />
        </div>
      )}

      <div className={`min-w-0 ${isUser ? "max-w-[78%]" : "max-w-[88%]"}`}>
        {!isUser && showTime && (
          <div
            className="mb-1 flex items-center gap-2 text-[0.66rem] font-medium tracking-wide"
            style={{ color: "#7C8A83" }}
          >
            <span>Sikkim Tourism Assistant</span>
            <span
              className="h-0.5 w-0.5 rounded-full"
              style={{ background: "#7C8A83" }}
            />
            <span>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            isUser ? "rounded-tr-md" : "rounded-tl-md"
          }`}
          style={{
            background: isUser ? CHAT.userBubble : CHAT.assistantBubble,
            color: isUser ? CHAT.userText : CHAT.assistantText,
            border: isUser ? "none" : `1px solid ${CHAT.border}`,
            boxShadow:
              "0 1px 0 rgba(19,66,56,0.04), 0 1px 2px rgba(19,66,56,0.04)",
          }}
        >
          {msg.content ? (
            isUser ? (
              <div className="whitespace-pre-wrap text-[0.93rem] leading-[1.55]">
                {msg.content}
              </div>
            ) : (
              <AssistantMessage content={msg.content} />
            )
          ) : (
            <ThinkingIndicator />
          )}
        </div>
        {/* Provenance line — only for longer assistant answers, only on
            desktop where there's room. Reads like a printed footnote. */}
        {isUser === false && msg.content && msg.content.length > 180 && (
          <p
            className="mt-1.5 text-[0.62rem] tracking-wide"
            style={{ color: "#9AA59E" }}
          >
            Grounded in official Department records.
          </p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main Chat — works in two modes:

   compact=true   → widget body (panel/launcher variant). Background is fixed
                   parchment; messages fill the available region.
   compact=false  → standalone full-page chat. Same look, more breathing room.

   Both render identically: same palette, same spacing, same bubble rules.
   ─────────────────────────────────────────────────────────────────────── */
export function Chat({ compact = false }: { compact?: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* RAF-locked smooth scroll — feels calmer than instant jump on Android. */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  /* Auto-focus the input field once a turn ends so users can keep typing. */
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const t = setTimeout(
        () => inputRef.current?.focus({ preventScroll: true }),
        120,
      );
      return () => clearTimeout(t);
    }
  }, [isStreaming, messages.length]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");

    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const res = await createConversation();
        setConversationId(res.conversation.id);
        currentConvId = res.conversation.id;
      } catch (e) {
        console.error("Failed to create conversation", e);
        return;
      }
    }

    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      conversationId: currentConvId,
      role: "user",
      content: trimmed,
      createdAt: now,
    };
    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      conversationId: currentConvId,
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/conversations/${currentConvId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!response.ok)
        throw new Error(
          `Server returned ${response.status} — please try again.`,
        );
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const dataStr = part.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              assistantContent += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            /* non-JSON line — skip */
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      if (currentConvId) {
        try {
          const res = await fetchConversation(currentConvId);
          setMessages(res.messages);
        } catch {
          /* keep optimistic state */
        }
      }
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ background: CHAT.bg }}
      ref={scrollRef}
    >
      <ScrollArea className="flex-1 min-h-0">
        <div
          className={`mx-auto w-full ${compact ? "max-w-2xl px-3.5 pt-5 pb-4 sm:px-5" : "max-w-2xl px-4 pt-7 pb-6 sm:px-8 sm:pt-10"}`}
        >
          {messages.length === 0 ? (
            <EmptyState onPick={(t) => handleSend(t)} compact={compact} />
          ) : (
            <div className="space-y-5">
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showTime =
                  msg.role === "assistant" &&
                  (!prev || prev.role !== "assistant" || prev.id !== msg.id);
                return <Bubble key={msg.id} msg={msg} showTime={showTime} />;
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compose bar — sticks to the bottom, respects Android safe-areas. */}
      <div
        className="shrink-0 border-t backdrop-blur supports-[backdrop-filter]:bg-[#F6F0E3]/85"
        style={{
          background: CHAT.bg,
          borderColor: CHAT.border,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className={`mx-auto w-full ${compact ? "max-w-2xl px-3.5 py-3 sm:px-5" : "max-w-2xl px-4 py-4 sm:px-8"}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="relative flex items-end gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about permits, monasteries, routes…"
              disabled={isStreaming}
              className="rounded-xl border bg-white pr-12 text-[0.95rem] shadow-[0_1px_0_rgba(19,66,56,0.04)] transition-colors focus-visible:ring-2"
              style={{
                borderColor: CHAT.border,
                color: CHAT.assistantText,
                paddingTop: "0.85rem",
                paddingBottom: "0.85rem",
                boxShadow: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = CHAT.userBubble;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = CHAT.border;
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="absolute right-1.5 bottom-1.5 h-9 w-9 rounded-lg shadow-[0_6px_14px_-8px_rgba(19,66,56,0.6)] disabled:shadow-none"
              style={{
                background: input.trim() ? CHAT.userBubble : CHAT.borderStrong,
                color: "#FFFFFF",
              }}
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2.2} />
              )}
            </Button>
          </form>

          {/* Footer micro-line: brand provenance, like a printed footer. */}
          <div
            className="mt-2 flex items-center justify-between gap-3 text-[0.66rem] tracking-wide"
            style={{ color: "#9AA59E" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1 w-1 rounded-full"
                style={{
                  background: "#3FA45A",
                  boxShadow: "0 0 0 3px rgba(63,164,90,0.18)",
                }}
              />
              Connected to official records
            </span>
            <PrayerFlagBar className="max-w-[72px] opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
