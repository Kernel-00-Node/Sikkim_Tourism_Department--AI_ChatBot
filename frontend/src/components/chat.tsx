import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createConversation, fetchConversation, type Message } from "@/lib/api";
import { GOVT_LOGO_SRC } from "@/config/brand";

/* ── Prayer flag palette ─────────────────────────────────────────────────── */
const FLAG_COLORS = [
  { dot: "#EAB308", label: "yellow" },
  { dot: "#22C55E", label: "green" },
  { dot: "#EF4444", label: "red" },
  { dot: "#F8FAFC", label: "white" },
  { dot: "#3B82F6", label: "blue" },
];

const STARTER_ACCENTS = [
  { border: "#EAB308", icon: "#A16207", glow: "rgba(234,179,8,0.18)" },
  { border: "#22C55E", icon: "#166534", glow: "rgba(34,197,94,0.18)" },
  { border: "#EF4444", icon: "#991B1B", glow: "rgba(239,68,68,0.18)" },
  { border: "#3B82F6", icon: "#1D4ED8", glow: "rgba(59,130,246,0.18)" },
];

/* ── Prayer-flag thinking dots ───────────────────────────────────────────── */
function ThinkingIndicator({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-[5px] px-1 py-1.5">
      {FLAG_COLORS.map((f, i) => (
        <span
          key={i}
          className="inline-block rounded-full animate-bounce"
          style={{
            width: compact ? 6 : 5,
            height: compact ? 6 : 5,
            backgroundColor: f.dot,
            animationDelay: `${i * 120}ms`,
            animationDuration: "1.1s",
            boxShadow: `0 0 4px ${f.dot}88`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Markdown renderer ───────────────────────────────────────────────────── */
function AssistantMessage({
  content,
  compact,
}: {
  content: string;
  compact: boolean;
}) {
  const linkCls = compact
    ? "text-sky-300 underline underline-offset-2 hover:text-sky-200"
    : "text-primary underline underline-offset-2 hover:text-primary/80";
  const strongCls = compact
    ? "text-white font-semibold"
    : "text-foreground font-semibold";
  const codeCls = compact
    ? "bg-white/10 text-sky-200"
    : "bg-muted text-foreground";
  const hrCls = compact ? "border-white/10" : "border-border";
  const quoteCls = compact
    ? "border-white/20 text-white/70 italic"
    : "border-primary/25 text-muted-foreground italic";

  return (
    <div className="text-[0.93rem] leading-relaxed space-y-2.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className={strongCls}>{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 marker:text-current/60">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 marker:text-current/60">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h3 className="text-base font-serif font-semibold mt-3">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-base font-serif font-semibold mt-3">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-serif font-semibold mt-2">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-2 pl-3 ${quoteCls}`}>
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              className={`px-1.5 py-0.5 rounded-md text-[0.84em] font-mono ${codeCls}`}
            >
              {children}
            </code>
          ),
          hr: () => <hr className={`my-3 ${hrCls}`} />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={`text-left font-semibold py-1.5 px-2 border-b ${hrCls}`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`py-1.5 px-2 border-b ${hrCls}`}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ── Mountain + prayer flag empty-state illustration ─────────────────────── */
function SikkimIllustration({ compact }: { compact: boolean }) {
  const size = compact ? 96 : 120;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className="drop-shadow-lg mx-auto"
    >
      <circle
        cx="60"
        cy="60"
        r="58"
        fill="url(#skyGrad)"
        opacity={compact ? 0 : 0.25}
      />
      <circle cx="88" cy="22" r="9" fill="#FEF3C7" opacity={0.9} />
      <circle cx="91" cy="20" r="7" fill={compact ? "#0d1829" : "#e8f4fd"} />
      {[
        [20, 18],
        [35, 10],
        [70, 14],
        [100, 30],
        [15, 38],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="white" opacity={0.7} />
      ))}
      <path
        d="M0,90 L20,50 L40,68 L60,30 L80,55 L100,42 L120,65 L120,120 L0,120Z"
        fill="#1a3040"
        opacity={0.7}
      />
      <path d="M60,30 L52,52 L68,52Z" fill="white" opacity={0.5} />
      <path d="M100,42 L94,58 L106,58Z" fill="white" opacity={0.4} />
      <path
        d="M0,105 L25,72 L45,85 L65,58 L85,78 L105,65 L120,78 L120,120 L0,120Z"
        fill="#0f2030"
        opacity={0.85}
      />
      <path d="M65,58 L58,74 L72,74Z" fill="white" opacity={0.6} />
      <line
        x1="10"
        y1="48"
        x2="110"
        y2="36"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.8"
      />
      {[
        { x: 18, y: 46, c: "#3B82F6" },
        { x: 33, y: 43, c: "#F8FAFC" },
        { x: 48, y: 41, c: "#EF4444" },
        { x: 63, y: 39, c: "#22C55E" },
        { x: 78, y: 37, c: "#EAB308" },
        { x: 93, y: 36, c: "#3B82F6" },
        { x: 108, y: 35, c: "#F8FAFC" },
      ].map(({ x, y, c }, i) => (
        <polygon
          key={i}
          points={`${x},${y} ${x + 9},${y} ${x + 4.5},${y + 11}`}
          fill={c}
          opacity={0.9}
        />
      ))}
      <defs>
        <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="100%" stopColor="#060d18" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Main chat component ─────────────────────────────────────────────────── */
export function Chat({ compact = false }: { compact?: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // Auto-focus input after AI finishes responding so users can type immediately
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMessageText = text.trim();
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
      content: userMessageText,
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
        body: JSON.stringify({ message: userMessageText }),
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
            /* non-JSON line */
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

  const starterQuestions = [
    {
      text: "What permits do I need for Nathula Pass?",
      icon: MapPin,
      accent: STARTER_ACCENTS[0],
    },
    {
      text: "When is the best time to visit Gangtok?",
      icon: Calendar,
      accent: STARTER_ACCENTS[1],
    },
    {
      text: "Suggest a peaceful monastery to visit.",
      icon: Wind,
      accent: STARTER_ACCENTS[2],
    },
    {
      text: "How do I reach Gurudongmar Lake?",
      icon: MountainSnow,
      accent: STARTER_ACCENTS[3],
    },
  ];

  /* ── Compact (widget) styles ────────────────────────────────────────── */
  if (compact) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-transparent">
        <ScrollArea className="flex-1 p-3 sm:p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto py-8 text-center space-y-5 animate-in fade-in zoom-in duration-700">
              <SikkimIllustration compact />
              <div className="space-y-2">
                <h2 className="text-2xl font-serif text-white drop-shadow">
                  Welcome to Sikkim
                </h2>
                <p className="text-[0.82rem] leading-relaxed text-white/65 max-w-[220px] mx-auto">
                  Your local guide for permits, hidden valleys, ancient
                  monasteries, and alpine lakes.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full mt-2">
                {starterQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.text)}
                    className="text-left flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderLeft: `3px solid ${q.accent.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.11)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)")
                    }
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${q.accent.border}22` }}
                    >
                      <q.icon
                        className="w-3.5 h-3.5"
                        style={{ color: q.accent.border }}
                      />
                    </div>
                    <span className="text-[0.78rem] font-medium text-white/75 group-hover:text-white transition-colors leading-snug">
                      {q.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1 overflow-hidden p-1 bg-white/90 shadow ring-1 ring-white/20">
                      <img
                        src={GOVT_LOGO_SRC}
                        alt=""
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-[85%] shadow-sm text-sm ${
                      msg.role === "user"
                        ? "rounded-tr-sm text-gray-900"
                        : "rounded-tl-sm border border-white/10 text-white"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, #f5f3f0 0%, #ede8e0 100%)",
                          }
                        : {
                            background: "rgba(255,255,255,0.08)",
                            backdropFilter: "blur(8px)",
                          }
                    }
                  >
                    {msg.content ? (
                      msg.role === "assistant" ? (
                        <AssistantMessage content={msg.content} compact />
                      ) : (
                        <div className="text-[0.93rem] whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      )
                    ) : (
                      <ThinkingIndicator compact />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input — compact */}
        <div
          className="p-3 sm:p-4"
          style={{
            background: "rgba(0,0,0,0.3)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="relative flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Sikkim…"
              className="pr-12 py-5 rounded-full text-sm text-white placeholder:text-white/40 border-white/12 focus-visible:ring-white/20 focus-visible:border-white/25 transition-all"
              style={{ background: "rgba(255,255,255,0.10)" }}
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1.5 rounded-full w-9 h-9 shadow-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              }}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          </form>
          {/* Prayer flag accent strip */}
          <div className="flex gap-0.5 mt-2 mx-auto justify-center">
            {FLAG_COLORS.map((f, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full opacity-50"
                style={{ background: f.dot }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Full-page (non-compact) styles ─────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-card rounded-2xl shadow-sm border">
      <ScrollArea className="flex-1 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto py-12 text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="space-y-5">
              <SikkimIllustration compact={false} />
              <h2 className="text-3xl font-serif text-foreground">
                Welcome to Sikkim
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                I am your local guide. Ask me about permits, hidden valleys,
                ancient monasteries, or how to reach the alpine lakes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q.text)}
                  className="text-left flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 group hover:shadow-md"
                  style={{
                    borderLeftColor: q.accent.border,
                    borderLeftWidth: 3,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = `0 4px 16px ${q.accent.glow}`)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
                >
                  <div
                    className="p-2 rounded-lg transition-colors shrink-0"
                    style={{ background: `${q.accent.border}18` }}
                  >
                    <q.icon
                      className="w-4 h-4"
                      style={{ color: q.accent.icon }}
                    />
                  </div>
                  <span className="text-sm font-medium mt-0.5 text-foreground/80 group-hover:text-foreground transition-colors">
                    {q.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden p-1.5 bg-white ring-1 ring-border">
                    <img
                      src={GOVT_LOGO_SRC}
                      alt=""
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  </div>
                )}
                <div
                  className={`px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm border ${
                    msg.role === "user"
                      ? "bg-foreground text-background rounded-tr-sm"
                      : "bg-muted/50 text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <AssistantMessage content={msg.content} compact={false} />
                    ) : (
                      <div className="text-[0.95rem] whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    )
                  ) : (
                    <ThinkingIndicator compact={false} />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-background border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="max-w-3xl mx-auto relative flex items-center"
        >
          <Input
            ref={inputRef}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about destinations, permits, or travel tips..."
            className="pr-12 py-6 rounded-full shadow-inner text-base bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/30"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 rounded-full w-10 h-10 shadow-sm"
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
