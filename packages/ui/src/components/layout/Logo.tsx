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
 * Features an ultra-luminous aerodynamic emblem with guaranteed visibility
 * across both dark and light modes.
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
  const ringGradId = `dhrutoRingGrad_${id}`;
  const wingGradId = `dhrutoWingGrad_${id}`;
  const voltGradId = `dhrutoVoltGrad_${id}`;
  const amberGradId = `dhrutoAmberGrad_${id}`;
  const textGradId = `dhrutoTextGrad_${id}`;
  const shadowId = `dhrutoShadow_${id}`;

  // Dimension ratios (Emblem is 120x120, Full lockup is 480x120 -> 4:1 aspect ratio)
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
        aria-label="Dhruto Express"
      >
        <defs>
          {/* Luminous Emblem Base Gradient (Rich Emerald to Deep Obsidian) */}
          <linearGradient id={emblemGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="45%" stopColor="#047857" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* High-Contrast Luminous Border Ring */}
          <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>

          {/* Aerodynamic Speed Wing Gradient */}
          <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Supersonic Courier Bolt Gradient */}
          <linearGradient id={voltGradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          {/* High-Velocity Golden Parcel Core */}
          <linearGradient id={amberGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Wordmark Gradient Accent */}
          <linearGradient id={textGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={inverted ? "#34d399" : "#059669"} />
            <stop offset="55%" stopColor={inverted ? "#38bdf8" : "#0284c7"} />
            <stop offset="100%" stopColor={inverted ? "#818cf8" : "#4f46e5"} />
          </linearGradient>

          {/* Ambient Glow Shadow */}
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#047857" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Aerodynamic Velocity Squircle Mark (120x120) */}
        <g>
          {/* Main Squircle Container */}
          <rect
            x="4"
            y="4"
            width="112"
            height="112"
            rx="30"
            fill={`url(#${emblemGradId})`}
            filter={`url(#${shadowId})`}
          />

          {/* Glowing Luminous Boundary Ring */}
          <rect
            x="5.5"
            y="5.5"
            width="109"
            height="109"
            rx="28.5"
            stroke={`url(#${ringGradId})`}
            strokeWidth="2.5"
          />

          {/* Dynamic Speed Trails */}
          <path
            d="M18 72 H38 M14 80 H34 M20 88 H42"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />

          {/* Outer Speed Wing (Aerodynamic stylized D curve) */}
          <path
            d="M42 24 C68 24, 98 40, 102 60 C106 80, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 24 Z"
            fill={`url(#${wingGradId})`}
          />

          {/* Inner Supersonic Courier Arrow */}
          <path
            d="M48 32 L80 58 L56 62 L70 90 L34 56 L54 52 Z"
            fill={`url(#${voltGradId})`}
          />

          {/* Parcel Diamond Core (3D Faceted) */}
          <polygon points="76,46 90,56 78,66 64,56" fill={`url(#${amberGradId})`} />
          <polygon points="76,46 64,56 78,66" fill="#f59e0b" fillOpacity="0.75" />
          <circle cx="88" cy="38" r="4.5" fill="#38bdf8" />
          <circle cx="88" cy="38" r="2" fill="#ffffff" />
        </g>

        {/* 2. Bilingual Wordmark Lockup */}
        {!markOnly && (
          <g transform="translate(144, 4)">
            {/* Primary Wordmark "DhrutoExpress" */}
            <text
              x="0"
              y="62"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="56"
              fontWeight="950"
              letterSpacing="-2"
              fill={inverted ? "#ffffff" : "#0f172a"}
              className={cn("transition-colors", !inverted && "fill-[#0f172a] dark:fill-white")}
            >
              Dhruto
              <tspan
                dx="3"
                fill={`url(#${textGradId})`}
                fontWeight="900"
                letterSpacing="-1.2"
              >
                Express
              </tspan>
            </text>

            {/* Sub-row: Bengali Native Name + Pill + OS Subtitle */}
            <g transform="translate(2, 94)">
              <text
                x="0"
                y="0"
                fontFamily="'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                fill={inverted ? "#34d399" : "#059669"}
                className={cn(!inverted && "fill-[#059669] dark:fill-[#34d399]")}
              >
                দ্রুত
              </text>
              <circle
                cx="52"
                cy="-7"
                r="3"
                fill={inverted ? "rgba(255,255,255,0.4)" : "#cbd5e1"}
                className={cn(!inverted && "fill-[#cbd5e1] dark:fill-white/30")}
              />
              <text
                x="66"
                y="-2"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="12.5"
                fontWeight="700"
                letterSpacing="2"
                fill={inverted ? "#94a3b8" : "#64748b"}
                className={cn(!inverted && "fill-[#64748b] dark:fill-[#94a3b8]")}
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
