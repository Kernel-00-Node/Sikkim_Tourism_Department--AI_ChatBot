/**
 * Shared utility helpers.
 *
 * `cn` merges Tailwind class strings with clsx and tailwind-merge so that
 * conditional classes and overrides compose correctly without duplicates.
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a 6-digit hex colour to an `rgba(...)` string with the given alpha.
 * Used across chat components to build translucent theme-derived gradients.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    console.warn(`Invalid hex color: ${hex}`);
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}