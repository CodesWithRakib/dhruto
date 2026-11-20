import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Local classname merger.
 *
 * We intentionally do NOT re-export `cn` from `@dhruto/ui`: that package's
 * barrel re-exports client components ("use client"), which makes every
 * export — including `cn` — a client-side reference. Server components
 * cannot call a client function, so they need their own copy.
 *
 * The custom type scale (packages/ui/tailwind.preset.js fontSize) must be
 * registered, or tailwind-merge mistakes `text-caption` for a colour and
 * drops it next to `text-muted-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["display", "h1", "h2", "h3", "h4", "body", "body-sm", "caption", "label", "table"] },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
