/**
 * Chat palette — single source of truth for both the chat panel (chat.tsx) and
 * the floating widget (chat-widget.tsx). Reads the live theme from
 * `<html class="dark">` so every chat surface flips with the page toggle.
 *
 * Hex values are kept here only as design tokens; the live pixel values that
 * the browser actually paints come from the CSS custom properties defined on
 * `:root` and `.dark` in `index.css`. We resolve them via `getComputedStyle`
 * once per theme change to stay in sync.
 */
import { useEffect, useState } from "react";

export type ChatTheme = {
  bg: string;
  bgDeep: string;
  surface: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;
  pine: string;
  pineAlt: string;
  pineOn: string;
  accent: string;
  accentSoft: string;
  assistantBubble: string;
  flags: string[];
  /** Tokens for the launcher button + hint chip (theme-aware inverts). */
  launcherFg: string;
  launcherSurface: string;
  launcherHintBg: string;
  launcherHintInk: string;
};

/* ── Fallback palettes — mirror the values in :root / .dark. They are only
     used during the very first render before CSS has parsed. ──────────── */
const LIGHT: ChatTheme = {
  bg: "#F6F0E3",
  bgDeep: "#ECDFC8",
  surface: "#FFFFFF",
  border: "#D8CDB1",
  borderStrong: "#B7A98A",
  ink: "#1B2A24",
  inkSoft: "#52635C",
  inkMuted: "#7C8A83",
  inkFaint: "#9AA59E",
  pine: "#134238",
  pineAlt: "#1E5F52",
  pineOn: "#FFFFFF",
  accent: "#B07A1F",
  accentSoft: "#EBD8B0",
  assistantBubble: "#FDFAF2",
  flags: ["#1E5AA8", "#F1ECE0", "#C73E2A", "#3FA45A", "#E2B821"],
  launcherFg: "#FFFFFF",
  launcherSurface: "#FFFFFF",
  launcherHintBg: "#FFFFFF",
  launcherHintInk: "#1B2A24",
};

const DARK: ChatTheme = {
  bg: "#131C19",
  bgDeep: "#1B2622",
  surface: "#1B2622",
  border: "#2A3934",
  borderStrong: "#3D4F48",
  ink: "#E8EFEB",
  inkSoft: "#B7C2BD",
  inkMuted: "#8FA29B",
  inkFaint: "#6F7E77",
  pine: "#3FA88F",
  pineAlt: "#5DBDA4",
  pineOn: "#07120F",
  accent: "#E2A948",
  accentSoft: "#44341D",
  assistantBubble: "#1F2C28",
  flags: ["#1E5AA8", "#F1ECE0", "#C73E2A", "#3FA45A", "#E2B821"],
  launcherFg: "#07120F",
  launcherSurface: "#1B2622",
  launcherHintBg: "#1B2622",
  launcherHintInk: "#E8EFEB",
};

/* Names of the CSS variables that drive the styled surfaces, in the order */
const VAR_NAMES = [
  "bg",
  "bgDeep",
  "surface",
  "border",
  "borderStrong",
  "ink",
  "inkSoft",
  "inkMuted",
  "inkFaint",
  "pine",
  "pineAlt",
  "pineOn",
  "accent",
  "accentSoft",
  "assistantBubble",
  "launcherFg",
  "launcherSurface",
  "launcherHintBg",
  "launcherHintInk",
] as const;

/** Resolve the live values for the current theme straight from CSS. */
function readTheme(isDark: boolean): ChatTheme {
  if (typeof window === "undefined") return isDark ? DARK : LIGHT;
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  /* On the very first render `getComputedStyle` may not have parsed yet; the
     fallback objects below still render the correct palette because they
     mirror the values defined on :root / .dark in `index.css`. */
  const base = isDark ? DARK : LIGHT;
  const resolved: Record<string, string> = {};
  for (const key of VAR_NAMES) {
    const cssName = `--chat-${kebab(key)}`;
    const val = computed.getPropertyValue(cssName).trim();
    resolved[key] = val || base[key as keyof ChatTheme];
  }
  /* Flags don't change with the theme — keep them stable across both. */
  return { ...base, ...resolved } as ChatTheme;
}

function kebab(s: string) {
  return s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

/**
 * Hook that returns a theme-aware ChatTheme object, re-rendering any consumer
 * whenever the page theme flips. Reads theme from the `dark` class on
 * `<html>` and listens for class mutations so the chat surfaces stay in lock
 * step with the header toggle.
 */
export function useChatTheme(): ChatTheme {
  const [theme, setTheme] = useState<ChatTheme>(() => {
    if (typeof window === "undefined") return LIGHT;
    return readTheme(document.documentElement.classList.contains("dark"));
  });

  useEffect(() => {
    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(readTheme(isDark));
    };

    /* Initial sync (in case CSS vars were not yet available above). */
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Static lookup — useful for non-React callers (rare). */
export function getChatThemeCached(isDark: boolean): ChatTheme {
  return isDark ? DARK : LIGHT;
}

/** Five prayer-flag colours used in the header band hairline. */
export const PRAYER_FLAGS = ["#1E5AA8", "#F1ECE0", "#C73E2A", "#3FA45A", "#E2B821"];
