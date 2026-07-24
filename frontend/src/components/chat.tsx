import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useChatTheme,
  PRAYER_FLAGS,
  type ChatTheme,
} from "@/config/chat-theme";

/* Adds alpha to a "#rrggbb" token so translucent tints stay theme-aware
   instead of being hardcoded. Local copy — same helper also lives in
   chat-widget.tsx; not worth a shared module for six lines. */
function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
      {PRAYER_FLAGS.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Calm three-dot typing indicator. One subtle pulse, not a rainbow. ──── */
function ThinkingIndicator() {
  const theme = useChatTheme();
  return (
    <div
      className="flex items-center gap-1.5 py-0.5"
      aria-label="Assistant is responding"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${theme.pine}, ${theme.pineAlt})`,
            boxShadow: `0 0 8px 0 ${theme.pine}`,
          }}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/* ── Assistant markdown renderer. Sober, readable, brand-coloured links. ── */
function AssistantMessage({ content }: { content: string }) {
  const theme = useChatTheme();
  return (
    <div className="chat-markdown text-[0.95rem] leading-[1.6] space-y-2.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-[1.6]">{children}</p>,
          strong: ({ children }) => (
            <strong style={{ color: theme.pine, fontWeight: 600 }}>
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
              style={{ color: theme.accent }}
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
              style={{ borderColor: theme.accentSoft, color: theme.inkSoft }}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              className="px-1.5 py-0.5 rounded text-[0.85em]"
              style={{
                background: theme.bgDeep,
                color: theme.pine,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {children}
            </code>
          ),
          hr: () => (
            <hr
              className="my-3 border-0 h-px"
              style={{ background: theme.border }}
            />
          ),
          table: ({ children }) => (
            <div
              className="overflow-x-auto my-2 rounded-md border"
              style={{ borderColor: theme.border }}
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
                borderColor: theme.border,
                background: theme.bgDeep,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="py-1.5 px-2 border-b"
              style={{ borderColor: theme.border }}
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
  const theme = useChatTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center text-center mx-auto w-full ${
        compact ? "max-w-md py-7 gap-5" : "max-w-xl py-12 gap-7"
      }`}
    >
      {/* Brass seal-style emblem — single accent on the page */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex items-center justify-center rounded-full shadow-[0_8px_28px_-12px_rgba(19,66,56,0.35)]"
        style={{
          background: "#FFFFFF",
          border: `1px solid ${theme.border}`,
          padding: compact ? 8 : 11,
        }}
      >
        <span
          className="pointer-events-none absolute -inset-3 -z-10 rounded-full opacity-40 blur-xl"
          style={{ background: theme.pine }}
          aria-hidden="true"
        />
        <img
          src={GOVT_LOGO_SRC}
          alt="Government of Sikkim"
          draggable={false}
          className={compact ? "h-9 w-9" : "h-12 w-12"}
          style={{ objectFit: "contain" }}
        />
      </motion.div>

      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <p
          className={`font-semibold uppercase tracking-[0.18em] ${
            compact ? "text-[0.6rem]" : "text-[0.66rem]"
          }`}
          style={{ color: theme.accent }}
        >
          Sikkim Tourism · Civil Aviation
        </p>
        <h1
          className={
            compact ? "text-[1.5rem]" : "text-[1.9rem] sm:text-[2.1rem]"
          }
          style={{
            fontFamily: "Fraunces, serif",
            color: theme.ink,
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
          style={{ color: theme.inkSoft }}
        >
          Permits, monastery hours, the road to Gurudongmar, what to pack for
          Yumthang — answered from the Department's own records.
        </p>
      </div>

      {/* Suggested questions — staggered entrance, chevron + shimmer on hover. */}
      <div className="w-full space-y-2">
        {STARTERS.map(({ text, icon: Icon, eyebrow }, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => onPick(text)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15 + i * 0.08,
              duration: 0.35,
              ease: "easeOut",
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left shadow-[0_1px_0_rgba(19,66,56,0.04)] backdrop-blur-md transition-shadow duration-200 hover:shadow-[0_10px_26px_-10px_rgba(19,66,56,0.32)]"
            style={{ borderColor: theme.border, background: theme.surface }}
          >
            <span
              className="pointer-events-none absolute inset-y-0 -left-1/3 hidden w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-chat-shimmer sm:block"
              aria-hidden="true"
            />
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
              style={{ background: theme.bgDeep, color: theme.pine }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <span className="relative min-w-0 flex-1">
              <span
                className="block text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                style={{ color: theme.accent }}
              >
                {eyebrow}
              </span>
              <span
                className="block text-[0.88rem] font-medium leading-snug mt-0.5"
                style={{ color: theme.ink }}
              >
                {text}
              </span>
            </span>
            <ChevronRight
              className="relative h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: theme.borderStrong }}
            />
          </motion.button>
        ))}
      </div>

      <p
        className={compact ? "text-[0.7rem]" : "text-[0.74rem]"}
        style={{ color: theme.inkMuted }}
      >
        Your conversations are private — used only to keep context within this
        session.
      </p>
    </motion.div>
  );
}

/* ── Single chat bubble. Assistant on the left, user on the right. ───────── */
function Bubble({ msg, showTime }: { msg: Message; showTime: boolean }) {
  const theme = useChatTheme();
  const isUser = msg.role === "user";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.05,
          }}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden"
          style={{ background: "#FFFFFF", border: `1px solid ${theme.border}` }}
        >
          <img
            src={GOVT_LOGO_SRC}
            alt=""
            draggable={false}
            className="h-full w-full object-contain p-0.5"
          />
        </motion.div>
      )}

      <div className={`min-w-0 ${isUser ? "max-w-[78%]" : "max-w-[88%]"}`}>
        {!isUser && showTime && (
          <div
            className="mb-1 flex items-center gap-2 text-[0.66rem] font-medium tracking-wide"
            style={{ color: theme.inkMuted }}
          >
            <span>Sikkim Tourism Assistant</span>
            <span
              className="h-0.5 w-0.5 rounded-full"
              style={{ background: theme.inkMuted }}
            />
            <span>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 backdrop-blur-md ${
            isUser ? "rounded-tr-md" : "rounded-tl-md"
          }`}
          style={{
            background: isUser
              ? `linear-gradient(135deg, ${theme.pine} 0%, ${theme.pineAlt} 100%)`
              : theme.assistantBubble,
            color: isUser ? theme.pineOn : theme.ink,
            border: isUser ? "none" : `1px solid ${theme.border}`,
            boxShadow: isUser
              ? "0 8px 20px -10px rgba(19,66,56,0.45)"
              : "0 1px 0 rgba(19,66,56,0.04), 0 1px 2px rgba(19,66,56,0.04)",
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
            style={{ color: theme.inkFaint }}
          >
            Grounded in official Department records.
          </p>
        )}
      </div>
    </motion.div>
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
  const theme = useChatTheme();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Grow the textarea with content, capped so it never eats the thread. */
  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

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
      className="relative flex h-full min-h-0 flex-col backdrop-blur-xl backdrop-saturate-150"
      style={{ background: theme.bg }}
      ref={scrollRef}
    >
      {/* A fixed colour wash behind the conversation — no motion, but with
          enough presence for the bubbles' backdrop-blur to actually have
          something to blur. Too faint here and the "glass" bubbles just
          look like flat translucent boxes, which is what happened when
          this got dialled all the way down along with the moving orbs. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(65% 50% at 100% 0%, ${withAlpha(theme.pine, 0.16)} 0%, transparent 72%),
            radial-gradient(60% 45% at 0% 100%, ${withAlpha(theme.accent, 0.11)} 0%, transparent 72%),
            radial-gradient(50% 40% at 100% 100%, ${withAlpha(theme.pineAlt, 0.1)} 0%, transparent 72%)
          `,
        }}
        aria-hidden="true"
      />

      <ScrollArea className="flex-1 min-h-0">
        <div
          className={`mx-auto w-full ${compact ? "max-w-2xl px-3.5 pt-5 pb-4 sm:px-5" : "max-w-2xl px-4 pt-7 pb-6 sm:px-8 sm:pt-10"}`}
        >
          {messages.length === 0 ? (
            <EmptyState onPick={(t) => handleSend(t)} compact={compact} />
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const prev = messages[idx - 1];
                  const showTime =
                    msg.role === "assistant" &&
                    (!prev || prev.role !== "assistant" || prev.id !== msg.id);
                  return <Bubble key={msg.id} msg={msg} showTime={showTime} />;
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compose bar — sticks to the bottom, respects Android safe-areas. */}
      <div
        className="shrink-0 border-t backdrop-blur-xl backdrop-saturate-150"
        style={{
          background: theme.bg,
          borderColor: theme.border,
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
              requestAnimationFrame(resizeInput);
            }}
            className="relative flex items-end gap-2 rounded-[1.4rem] border pr-1 shadow-[0_1px_0_rgba(19,66,56,0.04)] backdrop-blur-md transition-colors focus-within:shadow-[0_0_0_3px_rgba(19,66,56,0.12)]"
            style={{ borderColor: theme.border, background: theme.surface }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.pine;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                  requestAnimationFrame(resizeInput);
                }
              }}
              placeholder="Ask about permits, monasteries, routes…"
              disabled={isStreaming}
              rows={1}
              className="max-h-[140px] min-h-0 flex-1 resize-none border-0 bg-transparent py-3.5 pl-4 text-[0.95rem] leading-[1.5] shadow-none outline-none focus-visible:ring-0"
              style={{ color: theme.ink, boxShadow: "none" }}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || isStreaming}
              whileHover={input.trim() ? { scale: 1.08 } : undefined}
              whileTap={input.trim() ? { scale: 0.92 } : undefined}
              className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[0_6px_14px_-8px_rgba(19,66,56,0.6)] transition-shadow disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                background: input.trim()
                  ? `linear-gradient(135deg, ${theme.pine}, ${theme.pineAlt})`
                  : theme.borderStrong,
                color: theme.pineOn,
              }}
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2.2} />
              )}
            </motion.button>
          </form>
          <p
            className="mt-1.5 pl-1 text-[0.65rem]"
            style={{ color: theme.inkFaint }}
          >
            Enter to send · Shift + Enter for a new line
          </p>

          {/* Footer micro-line: brand provenance, like a printed footer. */}
          <div
            className="mt-2 flex items-center justify-between gap-3 text-[0.66rem] tracking-wide"
            style={{ color: theme.inkFaint }}
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
