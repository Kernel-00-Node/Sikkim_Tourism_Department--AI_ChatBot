import { useEffect, useState } from "react";

/**
 * Cycles through a list of phrases with a typewriter effect — types a
 * phrase out, holds, deletes it, then moves to the next. Used for the
 * bilingual (English / Hindi) greeting on the chat launcher.
 *
 * Respects prefers-reduced-motion by simply swapping phrases instantly.
 */
export function useTypewriter(
  phrases: string[],
  opts: { typingMs?: number; deletingMs?: number; holdMs?: number } = {},
) {
  const { typingMs = 45, deletingMs = 28, holdMs = 1600 } = opts;
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">(
    "typing",
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReduced) {
        const t = setInterval(() => {
          setIndex((i) => (i + 1) % phrases.length);
        }, holdMs + 900);
        setText(phrases[0] ?? "");
        return () => clearInterval(t);
      }
    }

    const current = phrases[index] ?? "";

    if (phase === "typing") {
      if (text.length < current.length) {
        const t = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          typingMs,
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("holding"), holdMs);
      return () => clearTimeout(t);
    }

    if (phase === "holding") {
      const t = setTimeout(() => setPhase("deleting"), holdMs);
      return () => clearTimeout(t);
    }

    // deleting
    if (text.length > 0) {
      const t = setTimeout(
        () => setText(current.slice(0, text.length - 1)),
        deletingMs,
      );
      return () => clearTimeout(t);
    }
    setIndex((i) => (i + 1) % phrases.length);
    setPhase("typing");
  }, [text, phase, index, phrases, typingMs, deletingMs, holdMs]);

  return text;
}