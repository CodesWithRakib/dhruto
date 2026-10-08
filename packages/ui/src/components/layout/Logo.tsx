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

/**
 * Dhruto brand lockup. Renders a tokenized mark + wordmark.
 * Exactly reflects the Dhruto courier identity from design mockups.
 */
export function Logo({
  size = "default",
  markOnly = false,
  inverted = false,
  className,
}: LogoProps) {
  // Scaling factors for different sizes based on standard Tailwind text sizes
  const width = size === "sm" ? 110 : size === "default" ? 130 : 160;
  const height = size === "sm" ? 34 : size === "default" ? 40 : 48;

  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <svg
        width={markOnly ? height : width}
        height={height}
        viewBox={markOnly ? "0 0 48 48" : "0 0 160 48"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Fast Delivery Icon (Dynamic color) */}
        <g fill="hsl(var(--primary))">
          <path d="M18 10 H30 A14 14 0 0 1 44 24 A14 14 0 0 1 30 38 H18 Z" />
          <path d="M4 16 H14 V20 H4 Z" />
          <path d="M1 24 H12 V28 H1 Z" />
          <path d="M6 32 H14 V36 H6 Z" />
        </g>
        
        {/* Bilingual Wordmark */}
        {!markOnly && (
          <g className={inverted ? "fill-white" : "fill-foreground"}>
            <text x="52" y="28" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-0.5">Dhruto</text>
            <text x="54" y="42" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="12" className={inverted ? "fill-white/70" : "fill-muted-foreground"}>দ্রুত</text>
          </g>
        )}
      </svg>
    </span>
  );
}
