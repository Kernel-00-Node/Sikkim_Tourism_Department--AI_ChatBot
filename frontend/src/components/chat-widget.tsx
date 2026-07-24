/**
 * Floating chat launcher + panel for the Sikkim Tourism Assistant.
 *
 * Standalone, self-contained module — kept as such so the Department can pull
 * just this file if they only want the widget. It only depends on:
 *   - `@/components/chat`         the conversation composer
 *   - `@/config/brand`             Government emblem source
 *   - `@/config/chat-theme`        live, theme-aware palette resolver
 *
 * Both the launcher button and the panel inherit dark/light from the page
 * via `useChatTheme()`, so flipping the header toggle re-paints this widget
 * without re-mounting it.
 */
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Maximize2, Minimize2, MessageSquare } from "lucide-react";
import { Chat } from "@/components/chat";
import { GOVT_LOGO_SRC } from "@/config/brand";
import { useChatTheme, PRAYER_FLAGS } from "@/config/chat-theme";

/* Five-flag hairline that signals the Department brand without narrating it. */
function PrayerFlagBar({
  className = "",
  colors = PRAYER_FLAGS,
}: {
  className?: string;
  colors?: string[];
}) {
  return (
    <div className={`flex h-[3px] w-full ${className}`} aria-hidden="true">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const C = useChatTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* Gentle one-time hint that fades in 3s after page load and never repeats.
     No bounce, no wave, no rainbow ring — just a quiet nudge the first time. */
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setShowHint(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  /* Soft cross-fade while the user toggles the theme, so 50 surfaces don't
     snap to a new colour in the same frame. The class auto-removes itself. */
  useEffect(() => {
    const root = document.body;
    root.classList.add("theme-transition");
    const t = setTimeout(() => root.classList.remove("theme-transition"), 360);
    return () => clearTimeout(t);
  }, [C.bg]);

  return (
    <>
      {/* ── Launcher ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {!isOpen && showHint && (
            <motion.button
              key="hint"
              type="button"
              onClick={() => setIsOpen(true)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-left shadow-[0_10px_28px_-14px_rgba(19,66,56,0.45)] transition-shadow hover:shadow-[0_14px_36px_-16px_rgba(19,66,56,0.55)]"
              style={{
                background: C.launcherHintBg,
                borderColor: C.border,
                color: C.launcherHintInk,
              }}
              aria-label="Open Sikkim Tourism Assistant"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden"
                style={{
                  background: C.launcherSurface,
                  border: `1px solid ${C.border}`,
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
                    color: C.launcherHintInk,
                    fontFamily: "Fraunces, serif",
                  }}
                >
                  Ask the Assistant
                </span>
                <span
                  className="text-[0.62rem] uppercase tracking-[0.18em]"
                  style={{ color: C.accent }}
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
          whileHover={{ scale: 1.025 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_30px_-12px_rgba(19,66,56,0.55)] transition-shadow hover:shadow-[0_18px_40px_-14px_rgba(19,66,56,0.6)] sm:h-[60px] sm:w-[60px]"
          style={{
            background: C.pine,
            color: C.launcherFg,
          }}
          aria-label={isOpen ? "Close chat" : "Open Sikkim Tourism Assistant"}
        >
          {/* Single low-key notification halo — calmer than before. */}
          {!isOpen && (
            <span
              className="chat-launcher-halo absolute inset-0 rounded-full"
              style={{
                background: "currentColor",
                opacity: 0.18,
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
                    background: C.accent,
                    borderColor: C.pine,
                  }}
                  aria-hidden
                >
                  <MessageSquare
                    className="h-2 w-2"
                    style={{ color: C.launcherFg }}
                    strokeWidth={3}
                  />
                </span>
                <img
                  src={GOVT_LOGO_SRC}
                  alt=""
                  draggable={false}
                  className="h-9 w-9 rounded-full object-contain"
                  style={{
                    /* In dark mode the lavender emblem mark won't survive on a
                       green launcher — let the chip-coloured ping above do
                       the work instead and show the emble in its native tone. */
                    filter:
                      C.launcherFg === "#FFFFFF"
                        ? "brightness(0) invert(1)"
                        : "none",
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
                ? "fixed inset-0 z-[70] flex flex-col sm:inset-3 sm:rounded-2xl sm:overflow-hidden sm:shadow-2xl"
                : "fixed inset-x-0 bottom-0 z-[70] flex h-[100dvh] flex-col rounded-t-2xl shadow-2xl sm:inset-auto sm:right-6 sm:bottom-[calc(60px+1.25rem)] sm:h-[78vh] sm:max-h-[680px] sm:w-[400px] sm:rounded-2xl sm:shadow-[0_30px_80px_-30px_rgba(19,66,56,0.45)]"
            }
            style={{ background: C.bg }}
          >
            {/* ── Header band ──────────────────────────────────────────── */}
            <div
              className="relative shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${C.pine} 0%, ${C.pineAlt} 100%)`,
                color: C.pineOn,
              }}
            >
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
                    <div
                      className="mt-0.5 flex items-center gap-1.5 text-[0.7rem]"
                      style={{ color: "rgba(255,255,255,0.78)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: "#7DD3A0",
                          boxShadow: "0 0 0 2px rgba(125,211,160,0.25)",
                        }}
                      />
                      <span>Online</span>
                      <span style={{ color: "rgba(255,255,255,0.42)" }}>·</span>
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
              style={{ background: C.bg }}
            >
              <Chat compact key={mounted ? "in" : "out"} />
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
