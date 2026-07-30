/**
 * Runtime dark-mode color override.
 *
 * The base ".dark { --background: ...; --card: ...; }" values in index.css
 * stay as the default. This module lets the user pick a single base HSL
 * color and derives the rest of the "surface" tokens (card, popover,
 * sidebar, border, muted, accent, input) from it, so every dark-mode panel
 * across the site shares one consistent tone.
 *
 * The chat widget/panel run on their own separate "--chat-*" tokens (see
 * chat-theme.ts) rather than the tokens above, so a matching set of
 * "--chat-bg" / "--chat-surface" / "--chat-launcher-*" overrides is derived
 * here too, using rgba() (the format chat-theme.ts expects) instead of the
 * "H S% L%" format the rest of the app uses.
 *
 * Text, brand (teal/gold), and destructive colors are intentionally left
 * alone — only background/surface tokens are recolored, so contrast and
 * branding stay intact no matter which hue the user picks. Same goes for
 * the chat's ink/pine/accent/border/bubble tokens — those stay put too.
 *
 * Applied via inline CSS custom properties on <html>, which win over the
 * stylesheet's ".dark {...}" rules. Because inline styles apply regardless
 * of the "dark" class, Layout must clear them whenever the user is in light
 * mode (see clearDarkPaletteVars) so light mode always stays the default.
 */

export interface DarkHSL {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100 (kept low by the UI so it stays usable as a dark surface)
}

const STORAGE_KEY = "darkPalette";

const SURFACE_VARS = [
    "--background",
    "--card",
    "--card-border",
    "--popover",
    "--popover-border",
    "--sidebar",
    "--sidebar-border",
    "--border",
    "--muted",
    "--accent",
    "--sidebar-accent",
    "--input",
] as const;

const CHAT_SURFACE_VARS = [
    "--chat-bg",
    "--chat-bg-deep",
    "--chat-surface",
    "--chat-launcher-surface",
    "--chat-launcher-hint-bg",
] as const;

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

function hsl(h: number, s: number, l: number) {
    return `${Math.round(h)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
}

/** Standard HSL → RGB conversion (h in degrees, s/l as 0-100). */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const hh = ((h % 360) + 360) % 360;
    const ss = clamp(s, 0, 100) / 100;
    const ll = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;
    let r = 0,
        g = 0,
        b = 0;
    if (hh < 60) [r, g, b] = [c, x, 0];
    else if (hh < 120) [r, g, b] = [x, c, 0];
    else if (hh < 180) [r, g, b] = [0, c, x];
    else if (hh < 240) [r, g, b] = [0, x, c];
    else if (hh < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
    ];
}

function rgba(h: number, s: number, l: number, alpha: number) {
    const [r, g, b] = hslToRgb(h, s, l);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function derivePalette({ h, s, l }: DarkHSL) {
    return {
        "--background": hsl(h, s, l),
        "--card": hsl(h, s * 0.94, l + 2),
        "--card-border": hsl(h, s * 0.62, l + 10),
        "--popover": hsl(h, s * 0.94, l + 2),
        "--popover-border": hsl(h, s * 0.62, l + 10),
        "--sidebar": hsl(h, s * 0.94, l + 2),
        "--sidebar-border": hsl(h, s * 0.62, l + 10),
        "--border": hsl(h, s * 0.62, l + 10),
        "--muted": hsl(h, s * 0.62, l + 6),
        "--accent": hsl(h, s * 0.62, l + 6),
        "--sidebar-accent": hsl(h, s * 0.62, l + 6),
        "--input": hsl(h, s * 0.62, l + 10),
    };
}

export function deriveChatPalette({ h, s, l }: DarkHSL) {
    // Mirrors the same base color at slightly different lightness/alpha
    // steps, matching how the original DARK palette in chat-theme.ts relates
    // "bg" → "bgDeep" → "surface" to each other.
    return {
        "--chat-bg": rgba(h, s, l, 0.55),
        "--chat-bg-deep": rgba(h, s, l + 7, 0.65),
        "--chat-surface": rgba(h, s * 0.85, l + 10, 0.55),
        "--chat-launcher-surface": rgba(h, s * 0.85, l + 10, 0.7),
        "--chat-launcher-hint-bg": rgba(h, s * 0.85, l + 10, 0.72),
    };
}

export function applyDarkPaletteVars(palette: DarkHSL) {
    const root = document.documentElement;
    const derived = derivePalette(palette);
    const chatDerived = deriveChatPalette(palette);
    for (const key of SURFACE_VARS) {
        root.style.setProperty(key, derived[key as keyof typeof derived]);
    }
    for (const key of CHAT_SURFACE_VARS) {
        root.style.setProperty(key, chatDerived[key as keyof typeof chatDerived]);
    }
}

export function clearDarkPaletteVars() {
    const root = document.documentElement;
    for (const key of SURFACE_VARS) {
        root.style.removeProperty(key);
    }
    for (const key of CHAT_SURFACE_VARS) {
        root.style.removeProperty(key);
    }
}

export function getSavedDarkPalette(): DarkHSL | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            typeof parsed?.h === "number" &&
            typeof parsed?.s === "number" &&
            typeof parsed?.l === "number"
        ) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

export function saveDarkPalette(palette: DarkHSL) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
}

export function resetDarkPalette() {
    localStorage.removeItem(STORAGE_KEY);
    clearDarkPaletteVars();
}

export const DARK_PRESETS: { label: string; value: DarkHSL }[] = [
    { label: "Deep Forest (default)", value: { h: 170, s: 32, l: 8 } },
    { label: "Pure Black", value: { h: 0, s: 0, l: 4 } },
    { label: "Charcoal", value: { h: 220, s: 8, l: 9 } },
    { label: "Slate", value: { h: 215, s: 25, l: 10 } },
    { label: "Midnight Blue", value: { h: 222, s: 47, l: 9 } },
    { label: "Espresso", value: { h: 24, s: 30, l: 10 } },
    { label: "Wine", value: { h: 350, s: 40, l: 10 } },
    { label: "Indigo", value: { h: 250, s: 40, l: 11 } },
    { label: "Plum", value: { h: 280, s: 35, l: 11 } },
];
