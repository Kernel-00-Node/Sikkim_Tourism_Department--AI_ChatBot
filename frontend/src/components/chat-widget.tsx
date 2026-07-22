import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Chat } from "@/components/chat";
import { GOVT_LOGO_SRC } from "@/config/brand";

/* ── Prayer flag colours (Blue White Red Green Yellow) ────────────────────── */
const FLAG_COLORS = ["#EAB308", "#16A34A", "#C0392B", "#F0EDE8", "#2563EB"];

const GREETINGS = [
  {
    text: "Namaste!",
    sub: "Ask me about permits, monasteries, or the best time to visit. 🏔️",
  },
  { text: "नमस्ते!", sub: "सिक्किम यात्रा के बारे में पूछें। 🏔️" },
  {
    text: "བཀྲ་ཤིས་བདེ་ལེགས།",
    sub: "Tashi Delek! Ask me anything about Sikkim. 🏔️",
  },
  { text: "নমস্কার!", sub: "সিকিম ভ্রমণে সাহায্য করতে পারি। 🏔️" },
  { text: "नमस्ते!", sub: "सिक्किम भ्रमणको बारे सोध्नुस्। 🏔️" },
];

type Phase = "typing" | "hold" | "erasing";

function useTypedGreeting() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    const chars = [...GREETINGS[idx].text];
    if (phase === "typing") {
      const dispChars = [...displayed];
      if (dispChars.length < chars.length) {
        const t = setTimeout(
          () => setDisplayed(chars.slice(0, dispChars.length + 1).join("")),
          80,
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("hold"), 2200);
      return () => clearTimeout(t);
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("erasing"), 800);
      return () => clearTimeout(t);
    }
    if (phase === "erasing") {
      const dispChars = [...displayed];
      if (dispChars.length > 0) {
        const t = setTimeout(
          () => setDisplayed(dispChars.slice(0, -1).join("")),
          38,
        );
        return () => clearTimeout(t);
      }
      setIdx((i) => (i + 1) % GREETINGS.length);
      setPhase("typing");
    }
  }, [displayed, phase, idx]);

  return { displayed, sub: GREETINGS[idx].sub, isTyping: phase === "typing" };
}

/* ── Prayer flag colour bar (compact decorative strip) ───────────────────── */
function PrayerFlagStrip() {
  return (
    <div
      className="flex w-full h-[3px] select-none pointer-events-none"
      aria-hidden="true"
    >
      {FLAG_COLORS.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ── Snow / star particles ───────────────────────────────────────────────── */
const PARTICLES = [
  { x: "8%", top: "-4%", size: 2, delay: "0s", dur: "9s", drift: "12px" },
  { x: "18%", top: "-8%", size: 3, delay: "1.4s", dur: "11s", drift: "-8px" },
  { x: "32%", top: "-2%", size: 2, delay: "0.7s", dur: "8.5s", drift: "18px" },
  { x: "44%", top: "-6%", size: 4, delay: "2.3s", dur: "10s", drift: "-14px" },
  { x: "56%", top: "-3%", size: 2, delay: "0.3s", dur: "9.5s", drift: "10px" },
  { x: "67%", top: "-7%", size: 3, delay: "1.9s", dur: "12s", drift: "-20px" },
  { x: "79%", top: "-1%", size: 2, delay: "3.1s", dur: "8.2s", drift: "15px" },
  {
    x: "89%",
    top: "-5%",
    size: 3,
    delay: "0.9s",
    dur: "10.5s",
    drift: "-10px",
  },
  { x: "23%", top: "-9%", size: 2, delay: "4.2s", dur: "9.8s", drift: "8px" },
  { x: "50%", top: "-4%", size: 2, delay: "2.7s", dur: "7.8s", drift: "-16px" },
  { x: "73%", top: "-2%", size: 3, delay: "1.1s", dur: "11.5s", drift: "20px" },
  { x: "5%", top: "-6%", size: 2, delay: "3.8s", dur: "8.8s", drift: "-6px" },
  { x: "38%", top: "-3%", size: 2, delay: "0.5s", dur: "10.2s", drift: "14px" },
  { x: "62%", top: "-8%", size: 3, delay: "2.1s", dur: "9.1s", drift: "-18px" },
  { x: "95%", top: "-5%", size: 2, delay: "1.6s", dur: "7.5s", drift: "9px" },
];

function SnowLayer() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-[2]"
      aria-hidden="true"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-snow-fall"
          style={{
            left: p.x,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: 0,
            animationDelay: p.delay,
            animationDuration: p.dur,
            ["--drift" as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}

/* ── Mountain silhouette ─────────────────────────────────────────────────── */
function MountainRidge() {
  return (
    <svg
      viewBox="0 0 400 55"
      className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-[1]"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Back range */}
      <path
        d="M0,55 L0,38 L30,20 L60,32 L95,12 L130,28 L165,8 L200,22 L235,6 L270,24 L305,14 L340,30 L370,10 L400,22 L400,55 Z"
        fill="white"
        opacity={0.06}
      />
      {/* Front range */}
      <path
        d="M0,55 L0,48 L35,32 L70,44 L105,28 L140,42 L175,22 L210,38 L245,26 L280,40 L315,30 L350,44 L385,32 L400,40 L400,55 Z"
        fill="white"
        opacity={0.1}
      />
    </svg>
  );
}

/* ── Starfield ───────────────────────────────────────────────────────────── */
const STARS = [
  { x: "12%", y: "8%", s: 1.5, delay: "0s" },
  { x: "28%", y: "15%", s: 1, delay: "1.2s" },
  { x: "45%", y: "6%", s: 2, delay: "0.5s" },
  { x: "62%", y: "18%", s: 1.5, delay: "2.1s" },
  { x: "78%", y: "9%", s: 1, delay: "0.8s" },
  { x: "90%", y: "14%", s: 1.5, delay: "1.7s" },
  { x: "7%", y: "22%", s: 1, delay: "3.0s" },
  { x: "35%", y: "25%", s: 1.5, delay: "0.3s" },
  { x: "55%", y: "12%", s: 1, delay: "2.5s" },
  { x: "83%", y: "20%", s: 2, delay: "1.0s" },
];

function StarField() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
      aria-hidden="true"
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-star-twinkle"
          style={{
            left: s.x,
            top: s.y,
            width: s.s,
            height: s.s,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasNudged, setHasNudged] = useState(false);
  const { displayed, sub, isTyping } = useTypedGreeting();

  useEffect(() => {
    const t = setTimeout(() => setHasNudged(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  return (
    <>
      {/* ── Launcher ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-3">
        {/* Greeting bubble */}
        <AnimatePresence>
          {!isOpen && hasNudged && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-1 bg-card border shadow-lg rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 max-w-[200px] sm:max-w-[240px] cursor-pointer"
              onClick={() => setIsOpen(true)}
            >
              <span className="text-[0.85rem] sm:text-sm font-semibold text-foreground leading-snug font-serif">
                {displayed}
                <span
                  className={`inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle animate-cursor-blink ${isTyping ? "" : "opacity-0"}`}
                />
              </span>
              <span className="text-[0.68rem] sm:text-xs text-muted-foreground leading-snug">
                {sub}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating button */}
        <motion.button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.06 }}
          animate={!isOpen ? { y: [0, -5, 0] } : { y: 0 }}
          transition={
            !isOpen
              ? {
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 1.4,
                }
              : { duration: 0.2 }
          }
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 overflow-hidden border border-white/20"
          aria-label={isOpen ? "Close chat" : "Open Sikkim Tourism Assistant"}
        >
          {/* Dual-ring pulse */}
          {!isOpen && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />
              <span className="absolute inset-0 rounded-full bg-secondary/25 animate-ping-slower" />
            </>
          )}
          {/* Prayer flag colour ring */}
          {!isOpen && (
            <span className="absolute inset-[-3px] rounded-full animate-flag-ring pointer-events-none" />
          )}
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <X className="w-6 h-6" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white p-1 shadow-sm overflow-hidden"
              >
                <img
                  src={GOVT_LOGO_SRC}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
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
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={
              isFullscreen
                ? "fixed inset-0 z-[70] flex flex-col"
                : "fixed bottom-24 right-5 sm:right-6 z-[70] w-[calc(100vw-2.5rem)] sm:w-[400px] h-[72vh] max-h-[660px] flex flex-col"
            }
          >
            <div
              className={`flex flex-col h-full overflow-hidden shadow-2xl ${isFullscreen ? "" : "rounded-3xl"}`}
            >
              {/* ── Header ─────────────────────────────────────────────── */}
              <div
                className="relative shrink-0 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #143C35 0%, #277A6B 54%, #D9A03B 100%)",
                }}
              >
                {/* Radial highlight */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_20%_0%,white,transparent_55%)]" />

                {/* Prayer flags strip */}
                <PrayerFlagStrip />

                {/* Title row */}
                <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 ring-2 ring-white/20 p-1.5 overflow-hidden shadow-lg">
                      <img
                        src={GOVT_LOGO_SRC}
                        alt=""
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif font-semibold leading-tight truncate text-white">
                        Sikkim Tourism Assistant
                      </p>
                      <p className="text-[0.68rem] text-white/75 flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Online · Dept. of Tourism &amp; Civil Aviation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((v) => !v)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors text-white"
                      aria-label={
                        isFullscreen ? "Exit full screen" : "Full screen"
                      }
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors text-white"
                      aria-label="Close chat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Body ───────────────────────────────────────────────── */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                {/* Animated night-sky gradient */}
                <div
                  className="absolute inset-0 animate-sikkim-gradient pointer-events-none"
                  aria-hidden="true"
                  style={{
                    background:
                      "linear-gradient(135deg, #081412, #0d201c, #13322d, #0c1c19, #081412)",
                    backgroundSize: "400% 400%",
                  }}
                />
                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-black/15 pointer-events-none" />

                {/* Atmospheric blobs */}
                <div
                  className="absolute -top-12 -left-12 w-52 h-52 rounded-full bg-blue-950/60 blur-3xl pointer-events-none animate-drift-clouds"
                  aria-hidden="true"
                />
                <div
                  className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-drift-clouds-slow"
                  aria-hidden="true"
                />
                <div
                  className="absolute top-1/3 right-0 w-32 h-32 rounded-full bg-secondary/15 blur-2xl pointer-events-none animate-drift-clouds"
                  style={{ animationDelay: "8s" }}
                  aria-hidden="true"
                />

                {/* Stars */}
                <StarField />
                {/* Snow */}
                <SnowLayer />
                {/* Mountain silhouette */}
                <MountainRidge />

                {/* Top fade */}
                <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/25 to-transparent pointer-events-none z-[3]" />

                {/* Chat */}
                <div className="relative z-10 h-full">
                  <Chat compact />
                </div>
              </div>
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
