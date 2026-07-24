import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Maximize2, Minimize2, MessageCircle } from "lucide-react";
import { Chat } from "@/components/chat";
import { GOVT_LOGO_SRC } from "@/config/brand";
import { useChatTheme, PRAYER_FLAGS } from "@/config/chat-theme";
import { useTypewriter } from "@/hooks/use-typewriter";

/* Bilingual greeting rotation for the launcher hint chip — English and
   Hindi, alternating, so the nudge reads naturally to both audiences. */
const GREETINGS = [
  "Namaste! Ask me anything 👋",
  "नमस्ते! कुछ भी पूछें 👋",
  "Need help planning your trip?",
  "यात्रा की योजना बनानी है?",
];

/* Adds alpha to a "#rrggbb" token so translucent text/hover states stay
   theme-aware instead of being hardcoded to white. */
function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Five-flag hairline that signals the Department brand without narrating it. */
function PrayerFlagBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-[3px] w-full ${className}`} aria-hidden="true">
      {PRAYER_FLAGS.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const theme = useChatTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const greeting = useTypewriter(GREETINGS);

  /* Gentle one-time hint that fades in 3s after page load and never repeats.
     No bounce, no wave, no rainbow ring — just a quiet nudge the first time. */
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  return (
    <>
      {/* ── Launcher ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {!isOpen && showHint && (
            <motion.button
              type="button"
              onClick={() => setIsOpen(true)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="group flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-left shadow-[0_10px_28px_-14px_rgba(19,66,56,0.4)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:shadow-[0_14px_36px_-16px_rgba(19,66,56,0.5)]"
              style={{
                borderColor: theme.border,
                background: theme.launcherHintBg,
              }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${theme.border}`,
                }}
              >
                <img
                  src={GOVT_LOGO_SRC}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain p-1"
                />
              </span>
              <span className="flex flex-col leading-tight">
                <span
                  className="text-[0.82rem] font-semibold whitespace-nowrap"
                  style={{
                    color: theme.launcherHintInk,
                    fontFamily: "Fraunces, serif",
                  }}
                >
                  {greeting}
                  <span
                    className="animate-chat-caret ml-0.5 inline-block h-[0.95em] w-[1.5px] translate-y-[0.12em] align-middle"
                    style={{ background: theme.accent }}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className="text-[0.62rem] uppercase tracking-[0.18em]"
                  style={{ color: theme.accent }}
                >
                  Tourism · Civil Aviation
                </span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className={!isOpen ? "animate-chat-float" : undefined}>
          <motion.button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.05 }}
            className="chat-glow-ring focus-ring relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_30px_-12px_rgba(19,66,56,0.55)] ring-1 ring-white/15 backdrop-blur-md transition-shadow hover:shadow-[0_18px_40px_-14px_rgba(19,66,56,0.6)] sm:h-[60px] sm:w-[60px]"
            style={{
              background: `linear-gradient(145deg, ${theme.pine} 0%, ${theme.pineAlt} 100%)`,
              color: theme.launcherFg,
            }}
            aria-label={isOpen ? "Close chat" : "Open Sikkim Tourism Assistant"}
          >
            {/* Single low-key notification halo — far calmer than before. */}
            {!isOpen && (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: "rgba(19,66,56,0.18)",
                  animation: "chat-launcher-halo 3.2s ease-in-out infinite",
                }}
                aria-hidden
              />
            )}
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <X className="h-5 w-5" strokeWidth={2.2} />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative"
                >
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2"
                    style={{
                      background: theme.accent,
                      borderColor: theme.pine,
                    }}
                    aria-hidden
                  >
                    <MessageCircle
                      className="h-2 w-2 text-white"
                      strokeWidth={3}
                    />
                  </span>
                  <img
                    src={GOVT_LOGO_SRC}
                    alt=""
                    draggable={false}
                    className="h-9 w-9 rounded-full object-contain"
                    style={{
                      filter:
                        theme.launcherFg === "#FFFFFF"
                          ? "brightness(0) invert(1)"
                          : "brightness(0)",
                    }}
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={
              isFullscreen
                ? "chat-glow-ring fixed inset-0 z-[70] flex flex-col backdrop-blur-3xl backdrop-saturate-150 sm:inset-3 sm:rounded-2xl sm:overflow-hidden sm:shadow-2xl"
                : "chat-glow-ring fixed inset-x-0 bottom-0 z-[70] flex h-[100dvh] flex-col overflow-hidden rounded-t-3xl shadow-2xl backdrop-blur-3xl backdrop-saturate-150 sm:inset-auto sm:right-6 sm:bottom-[calc(60px+1.25rem)] sm:h-[78vh] sm:max-h-[680px] sm:w-[404px] sm:rounded-3xl sm:shadow-[0_32px_90px_-28px_rgba(19,66,56,0.5)]"
            }
            style={{
              background: theme.surface,
              boxShadow: `0 32px 90px -28px rgba(19,66,56,0.55), inset 0 1px 0 0 rgba(255,255,255,0.2)`,
            }}
          >
            {/* Animated colour-mesh layer sitting under the glass — this is
                what makes the blur actually read as "glass" instead of a
                flat tint. It drifts slowly, forever, behind every surface. */}
            <div
              className="animate-chat-mesh pointer-events-none absolute inset-0 -z-10 opacity-70"
              style={{
                background: `
                  radial-gradient(38% 42% at 12% 18%, ${withAlpha(theme.pine, 0.35)} 0%, transparent 70%),
                  radial-gradient(34% 40% at 88% 12%, ${withAlpha(theme.accent, 0.32)} 0%, transparent 70%),
                  radial-gradient(46% 50% at 70% 92%, ${withAlpha(theme.pineAlt, 0.3)} 0%, transparent 70%),
                  radial-gradient(30% 34% at 10% 90%, ${withAlpha(theme.accent, 0.22)} 0%, transparent 70%)
                `,
              }}
              aria-hidden="true"
            />
            {/* ── Header band ──────────────────────────────────────────── */}
            <div
              className="animate-chat-header relative shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(120deg, ${theme.pine} 0%, ${theme.pineAlt} 45%, ${theme.accent} 100%)`,
                color: theme.pineOn,
              }}
            >
              {/* Prayer flag strip — the only visible "flash" of colour. */}
              <PrayerFlagBar />

              {/* Soft diagonal sheen — depth without noise or texture. */}
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(120% 140% at 15% -20%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%)",
                }}
                aria-hidden="true"
              />

              {/* Floating, breathing colour orbs — the classic glassmorphism depth cue. */}
              <div
                className="animate-chat-orb pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full opacity-45 blur-2xl"
                style={{ background: theme.accent }}
                aria-hidden="true"
              />
              <div
                className="animate-chat-orb-slow pointer-events-none absolute -left-10 top-6 h-24 w-24 rounded-full opacity-30 blur-2xl"
                style={{ background: "#FFFFFF" }}
                aria-hidden="true"
              />

              {/* Hairline glass edge under the header. */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                }}
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-md"
                    style={{ background: "#FFFFFF" }}
                  >
                    <img
                      src={GOVT_LOGO_SRC}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[0.98rem] font-semibold leading-tight truncate"
                      style={{ fontFamily: "Fraunces, serif" }}
                    >
                      Sikkim Tourism Assistant
                    </p>
                    <div
                      className="mt-0.5 flex items-center gap-1.5 text-[0.7rem]"
                      style={{ color: withAlpha(theme.pineOn, 0.75) }}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span
                          className="absolute inline-flex h-full w-full rounded-full"
                          style={{
                            background: "#7DD3A0",
                            animation:
                              "chat-launcher-halo 2.4s ease-in-out infinite",
                          }}
                        />
                        <span
                          className="relative inline-flex h-1.5 w-1.5 rounded-full"
                          style={{
                            background: "#7DD3A0",
                            boxShadow: "0 0 0 2px rgba(125,211,160,0.25)",
                          }}
                        />
                      </span>
                      <span>Online</span>
                      <span style={{ color: withAlpha(theme.pineOn, 0.4) }}>
                        ·
                      </span>
                      <span>Dept. of Tourism &amp; Civil Aviation</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((v) => !v)}
                    className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:flex"
                    style={{ color: theme.pineOn }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = withAlpha(
                        theme.pineOn,
                        0.15,
                      );
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    aria-label={
                      isFullscreen ? "Exit full screen" : "Full screen"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                    style={{ color: theme.pineOn }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = withAlpha(
                        theme.pineOn,
                        0.15,
                      );
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <div
              className="relative min-h-0 flex-1 backdrop-blur-xl backdrop-saturate-150"
              style={{ background: theme.bg }}
            >
              <Chat compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
