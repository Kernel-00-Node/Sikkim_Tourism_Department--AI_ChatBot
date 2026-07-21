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
