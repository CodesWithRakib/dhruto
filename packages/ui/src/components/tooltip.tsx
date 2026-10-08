import type * as React from "react";
import { cn } from "../lib/utils.js";

export interface TooltipProps {
  /** Visible trigger — must be focusable or contain focusable content for keyboard users. */
  children: React.ReactNode;
  /** Tooltip text. Also used as the accessible fallback when the trigger has no label. */
  content: string;
  /** Visual placement of the bubble. Defaults to top. */
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * Dhruto — zero-dependency tooltip for icon buttons, truncated text and
 * technical metadata.
 *
 * - Sighted mouse users get a CSS bubble on hover/focus-within.
 * - Keyboard and screen-reader users rely on the trigger's own `aria-label`,
 *   so ALWAYS label icon-only triggers; the tooltip is an enhancement, never
 *   the only source of meaning.
 * - Never put essential information only in a tooltip — if it should always
 *   be visible, render it as text instead.
 */
export function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const bubblePosition =
    side === "bottom"
      ? "left-1/2 top-full -translate-x-1/2 translate-y-2"
      : side === "left"
        ? "right-full top-1/2 -translate-y-1/2 -translate-x-2"
        : side === "right"
          ? "left-full top-1/2 -translate-y-1/2 translate-x-2"
          : "bottom-full left-1/2 -translate-x-1/2 -translate-y-2";

  return (
    <span
      className={cn(
        "group/tooltip relative inline-flex max-w-full items-center",
        className,
      )}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-50 max-w-56 whitespace-normal rounded-md border border-border/70 bg-popover px-2 py-1 text-caption font-medium text-popover-foreground shadow-soft",
          "opacity-0 transition-opacity duration-fast ease-out group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          bubblePosition,
        )}
      >
        {content}
      </span>
    </span>
  );
}
