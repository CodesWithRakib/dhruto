import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Local classname merger.
 *
 * We intentionally do NOT re-export `cn` from `@dhruto/ui`: that package's
 * barrel re-exports client components ("use client"), which makes every
 * export — including `cn` — a client-side reference. Server components
 * cannot call a client function, so they need their own copy.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
