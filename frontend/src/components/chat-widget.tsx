import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Maximize2, Minimize2, MessageCircle } from "lucide-react";
import { Chat } from "@/components/chat";
import { GOVT_LOGO_SRC } from "@/config/brand";

/* Hard-coded ChatBot palette (mirrors chat.tsx). Kept centralised here so the
   launcher, header band, and body use the same HSL-faithful hexes. */
const CHAT = {
  parchment: "#F6F0E3",
  surface: "#FFFFFF",
  border: "#D8CDB1",
  ink: "#1B2A24",
  pine: "#134238",
  pineAlt: "#1E5F52",
  accent: "#B07A1F",
  flags: ["#1E5AA8", "#F1ECE0", "#C73E2A", "#3FA45A", "#E2B821"],
} as const;

/* Five-flag hairline that signals the Department brand without narrating it. */
function PrayerFlagBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-[3px] w-full ${className}`} aria-hidden="true">
      {CHAT.flags.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(false);

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
              className="group flex items-center gap-2.5 rounded-full border bg-white py-1.5 pl-1.5 pr-4 text-left shadow-[0_10px_28px_-14px_rgba(19,66,56,0.4)] transition-all hover:shadow-[0_14px_36px_-16px_rgba(19,66,56,0.5)]"
              style={{ borderColor: CHAT.border }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${CHAT.border}`,
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
                  className="text-[0.82rem] font-semibold"
                  style={{
                    color: CHAT.ink,
                    fontFamily: "Fraunces, serif",
                  }}
                >
                  Ask the Assistant
                </span>
                <span
                  className="text-[0.62rem] uppercase tracking-[0.18em]"
                  style={{ color: CHAT.accent }}
                >
                  Tourism · Civil Aviation
                </span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_30px_-12px_rgba(19,66,56,0.55)] transition-shadow hover:shadow-[0_18px_40px_-14px_rgba(19,66,56,0.6)] sm:h-[60px] sm:w-[60px]"
          style={{ background: CHAT.pine }}
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
                    background: CHAT.accent,
                    borderColor: CHAT.pine,
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
                    filter: "brightness(0) invert(1)",
                  }}
                />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
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
                ? "fixed inset-0 z-[70] flex flex-col bg-white sm:inset-3 sm:rounded-2xl sm:overflow-hidden sm:shadow-2xl"
                : "fixed inset-x-0 bottom-0 z-[70] flex h-[100dvh] flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-auto sm:right-6 sm:bottom-[calc(60px+1.25rem)] sm:h-[78vh] sm:max-h-[680px] sm:w-[400px] sm:rounded-2xl sm:shadow-[0_30px_80px_-30px_rgba(19,66,56,0.45)]"
            }
          >
            {/* ── Header band ──────────────────────────────────────────── */}
            <div
              className="relative shrink-0 overflow-hidden text-white"
              style={{
                background: `linear-gradient(135deg, ${CHAT.pine} 0%, ${CHAT.pineAlt} 100%)`,
              }}
            >
              {/* Prayer flag strip — the only visible "flash" of colour. */}
              <PrayerFlagBar />

              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
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
                    <div className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-white/75">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: "#7DD3A0",
                          boxShadow: "0 0 0 2px rgba(125,211,160,0.25)",
                        }}
                      />
                      <span>Online</span>
                      <span className="text-white/40">·</span>
                      <span>Dept. of Tourism &amp; Civil Aviation</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((v) => !v)}
                    className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 sm:flex"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <div
              className="relative min-h-0 flex-1"
              style={{ background: CHAT.parchment }}
            >
              <Chat compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ChatWidgetLauncherIcon() {
  return null;
}
