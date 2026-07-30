/**
 * Runtime dark-mode color override.
 *
 * The base ".dark { --background: ...; --card: ...; }" values in index.css
 * stay as the default. This module lets the user pick a single base HSL
 * color and derives the rest of the "surface" tokens (card, popover,
 * sidebar, border, muted, accent, input) from it, so every dark-mode panel
 * across the site shares one consistent tone.
 *
 * Text, brand (teal/gold), and destructive colors are intentionally left
 * alone — only background/surface tokens are recolored, so contrast and
 * branding stay intact no matter which hue the user picks.
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

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

function hsl(h: number, s: number, l: number) {
    return `${Math.round(h)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
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

export function applyDarkPaletteVars(palette: DarkHSL) {
    const root = document.documentElement;
    const derived = derivePalette(palette);
    for (const key of SURFACE_VARS) {
        root.style.setProperty(key, derived[key as keyof typeof derived]);
    }
}

export function clearDarkPaletteVars() {
    const root = document.documentElement;
    for (const key of SURFACE_VARS) {
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
