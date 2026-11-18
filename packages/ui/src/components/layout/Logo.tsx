import { cn } from "../../lib/utils.js";

export interface LogoProps {
  /** Visual size of the mark and wordmark. */
  size?: "sm" | "default" | "lg";
  /** Hide the wordmark and show only the mark (used on collapsed sidebar and mobile header). */
  markOnly?: boolean;
  /** Invert wordmark colour for dark backgrounds. */
  inverted?: boolean;
  className?: string;
}

/** Shared mark geometry (120x120). Also used by the app icons in web-merchant. */
export const LOGO_PATHS = {
  trails: "M18 72 H38 M14 80 H34 M20 88 H42",
  wing: "M42 24 C68 24, 98 40, 102 60 C106 80, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 24 Z",
  arrow: "M48 32 L80 58 L56 62 L70 90 L34 56 L54 52 Z",
  parcel: "76,46 90,56 78,66 64,56",
} as const;

/**
 * Dhruto brand lockup — flat, single-theme.
 *
 * Colours come from the design tokens through Tailwind fill utilities
 * (`fill-primary`, `fill-brand`, `fill-foreground`), so the logo follows
 * tokens.css. No gradients, rings or drop shadows (flat design rule).
 */
export function Logo({
  size = "default",
  markOnly = false,
  inverted = false,
  className,
}: LogoProps) {
  // Emblem is 120x120; full lockup is 490x120.
  const height = size === "sm" ? 34 : size === "default" ? 42 : 52;
  const width = markOnly ? height : Math.round(height * 4.1);

  return (
    <span className={cn("inline-flex items-center shrink-0 select-none", className)}>
      <svg
        width={width}
        height={height}
        viewBox={markOnly ? "0 0 120 120" : "0 0 490 120"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 overflow-visible"
        role="img"
        aria-label="Dhruto Express"
      >
        {/* 1. Mark: primary squircle, white speed wing, lilac courier arrow */}
        <g>
          <rect x="4" y="4" width="112" height="112" rx="30" className="fill-primary" />
          <path
            d={LOGO_PATHS.trails}
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-brand"
          />
          <path d={LOGO_PATHS.wing} className="fill-white" />
          <path d={LOGO_PATHS.arrow} className="fill-brand" />
          <polygon points={LOGO_PATHS.parcel} className="fill-white" />
          <circle cx="88" cy="38" r="4.5" className="fill-brand" />
        </g>

        {/* 2. Bilingual wordmark */}
        {!markOnly && (
          <g transform="translate(144, 4)">
            <text
              x="0"
              y="62"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="56"
              fontWeight="950"
              letterSpacing="-2"
              className={inverted ? "fill-white" : "fill-foreground"}
            >
              Dhruto
              <tspan
                dx="3"
                fontWeight="900"
                letterSpacing="-1.2"
                className={inverted ? "fill-brand" : "fill-primary"}
              >
                Express
              </tspan>
            </text>

            <g transform="translate(2, 94)">
              <text
                x="0"
                y="0"
                fontFamily="'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                className={inverted ? "fill-brand" : "fill-primary"}
              >
                দ্রুত
              </text>
              <circle
                cx="52"
                cy="-7"
                r="3"
                className={inverted ? "fill-white/40" : "fill-muted-foreground/40"}
              />
              <text
                x="66"
                y="-2"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="12.5"
                fontWeight="700"
                letterSpacing="2"
                className={inverted ? "fill-inverse-muted" : "fill-muted-foreground"}
              >
                SMART LOGISTICS OS
              </text>
            </g>
          </g>
        )}
      </svg>
    </span>
  );
}
