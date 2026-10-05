import { cn } from "../../lib/utils.js";

export interface LogoProps {
  /** Visual size of the mark and wordmark. */
  size?: "sm" | "default" | "lg";
  /** Hide the wordmark and show only the mark (used on small screens). */
  markOnly?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-7 w-7 rounded-md", glyph: "h-4 w-4", text: "text-h4" },
  default: { box: "h-9 w-9 rounded-lg", glyph: "h-5 w-5", text: "text-h3" },
  lg: { box: "h-11 w-11 rounded-lg", glyph: "h-6 w-6", text: "text-h2" },
} as const;

/**
 * Dhruto brand lockup. Renders a tokenized mark + wordmark.
 * Colour comes entirely from semantic tokens so it adapts to the theme.
 */
export function Logo({ size = "default", markOnly = false, className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center bg-primary text-primary-foreground",
          s.box,
        )}
      >
        {/* Abstract forward-motion mark evoking parcel movement. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.glyph}
        >
          <path d="M3 12h11" />
          <path d="m11 8 4 4-4 4" />
          <path d="M18 5.5a5 5 0 0 1 0 13" opacity="0.5" />
        </svg>
      </span>
      {!markOnly ? (
        <span className={cn("font-bold tracking-tight text-foreground", s.text)}>
          Dhruto
        </span>
      ) : null}
    </span>
  );
}
