import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom type-scale keys from `tailwind.preset.js` (theme.extend.fontSize).
 * tailwind-merge only knows Tailwind's built-in sizes, so without this it
 * treats `text-caption` as a text *colour* and drops it next to
 * `text-muted-foreground` — silently rendering helper text at full size.
 * Keep in sync with the preset (and `apps/web-merchant/lib/cn.ts`).
 */
export const CUSTOM_FONT_SIZES = ["display", "h1", "h2", "h3", "h4", "body", "body-sm", "caption", "label", "table"];

const twMerge = extendTailwindMerge({ extend: { theme: { text: CUSTOM_FONT_SIZES } } });

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
