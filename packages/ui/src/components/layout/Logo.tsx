import * as React from "react";
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

/**
 * Dhruto brand lockup.
 * High-velocity courier & logistics operating system master identity.
 */
export function Logo({
  size = "default",
  markOnly = false,
  inverted = false,
  className,
}: LogoProps) {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9-_]/g, "");
  const emblemGradId = `dhrutoEmblemGrad_${id}`;
  const wingGradId = `dhrutoWingGrad_${id}`;
  const voltGradId = `dhrutoVoltGrad_${id}`;
  const amberGradId = `dhrutoAmberGrad_${id}`;
  const textGradId = `dhrutoTextGrad_${id}`;

  // Dimension ratios
  const height = size === "sm" ? 36 : size === "default" ? 44 : 54;
  const width = markOnly
    ? height
    : size === "sm"
      ? 145
      : size === "default"
        ? 180
        : 220;

  return (
    <span className={cn("inline-flex items-center shrink-0 select-none", className)}>
      <svg
        width={width}
        height={height}
        viewBox={markOnly ? "0 0 120 120" : "0 0 540 120"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 overflow-visible"
        aria-label="Dhruto Express"
      >
        <defs>
          <linearGradient id={emblemGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#31104b" />
          </linearGradient>

          <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>

          <linearGradient id={voltGradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id={amberGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          <linearGradient id={textGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* 1. Aerodynamic Velocity Squircle Mark */}
        <g>
          <rect width="120" height="120" rx="34" fill={`url(#${emblemGradId})`} />
          <rect
            x="2.5"
            y="2.5"
            width="115"
            height="115"
            rx="31.5"
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="2.5"
          />

          {/* Speed Trails */}
          <path
            d="M22 68 H42 M16 78 H36 M26 88 H48"
            stroke="#38bdf8"
            strokeOpacity="0.5"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Outer Speed Wing (Aerodynamic D curve) */}
          <path
            d="M42 26 C68 26, 98 42, 102 62 C106 82, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 26 Z"
            fill={`url(#${wingGradId})`}
          />

          {/* Inner Supersonic Courier Arrow */}
          <path d="M48 34 L78 58 L54 62 L68 88 L34 56 L54 52 Z" fill={`url(#${voltGradId})`} />

          {/* Parcel Core */}
          <polygon points="76,46 90,56 78,66 64,56" fill={`url(#${amberGradId})`} />
          <circle cx="88" cy="38" r="4.5" fill="#38bdf8" />
          <circle cx="88" cy="38" r="2" fill="#ffffff" />
        </g>

        {/* 2. Bilingual Wordmark Lockup */}
        {!markOnly && (
          <g transform="translate(144, 10)">
            <text
              x="0"
              y="58"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="56"
              fontWeight="950"
              letterSpacing="-2"
              className={inverted ? "fill-white" : "fill-foreground"}
            >
              Dhruto<tspan fill={`url(#${textGradId})`} fontWeight="900" letterSpacing="-1.2">Express</tspan>
            </text>

            <g transform="translate(2, 84)">
              <text
                x="0"
                y="14"
                fontFamily="'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                className="fill-primary"
              >
                দ্রুত
              </text>
              <circle cx="48" cy="8" r="2.5" className={inverted ? "fill-white/30" : "fill-muted-foreground/40"} />
              <text
                x="60"
                y="12"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="12"
                fontWeight="700"
                letterSpacing="1.5"
                className={inverted ? "fill-white/60" : "fill-muted-foreground"}
              >
                SMART LOGISTICS
              </text>
            </g>
          </g>
        )}
      </svg>
    </span>
  );
}
