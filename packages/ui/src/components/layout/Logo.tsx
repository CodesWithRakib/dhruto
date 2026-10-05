import { cn } from "../../lib/utils.js";

export interface LogoProps {
  /** Visual size of the mark and wordmark. */
  size?: "sm" | "default" | "lg";
  /** Hide the wordmark and show only the mark (used on small screens). */
  markOnly?: boolean;
  /** Invert wordmark colour for dark backgrounds (e.g. dark footer). */
  inverted?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-7 w-7 rounded-lg", glyph: "h-4 w-4", text: "text-h4" },
  default: { box: "h-9 w-9 rounded-xl", glyph: "h-5 w-5", text: "text-h3" },
  lg: { box: "h-11 w-11 rounded-xl", glyph: "h-6 w-6", text: "text-h2" },
} as const;

/**
 * Dhruto brand lockup. Renders a tokenized mark + wordmark.
 * Exactly reflects the Dhruto courier identity from design mockups.
 */
export function Logo({ size = "default", markOnly = false, inverted = false, className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center bg-primary text-white shadow-sm ring-1 ring-primary/20",
          s.box,
        )}
      >
        {/* Sleek forward arrow / leaf courier icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.glyph}
        >
          <path d="M4 12h12" />
          <path d="m11 7 5 5-5 5" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </span>
      {!markOnly ? (
        <span
          className={cn(
            "font-bold tracking-tight",
            inverted ? "text-white" : "text-foreground",
            s.text,
          )}
        >
          Dhruto
        </span>
      ) : null}
    </span>
  );
}
