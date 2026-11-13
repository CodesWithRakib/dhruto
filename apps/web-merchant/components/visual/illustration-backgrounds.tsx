"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface IllustrationBgProps extends React.HTMLAttributes<HTMLDivElement> {
  opacity?: number;
}

/**
 * 1. Auth Transit Grid
 * Interconnected logistics transit paths, glowing junction nodes, and subtle directional speed arrows.
 */
export function AuthIllustrationBg({ className, opacity = 0.45, ...props }: IllustrationBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
      style={{ opacity }}
      {...props}
    >
      <svg
        className="absolute -top-24 -right-24 h-[650px] w-[650px] text-primary/15 sm:h-[800px] sm:w-[800px]"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="auth-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id="auth-dot-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" fillOpacity="0.35" />
          </pattern>
        </defs>

        <rect width="800" height="800" fill="url(#auth-dot-grid)" />

        {/* Dynamic Route Coordinates */}
        <path
          d="M 120 180 Q 280 120 440 260 T 720 320"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="6 8"
          strokeOpacity="0.5"
        />
        <path
          d="M 80 480 C 240 380 400 580 680 420"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.4"
        />
        <path
          d="M 300 100 L 520 600"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeOpacity="0.25"
        />

        {/* Junction Nodes */}
        <circle cx="440" cy="260" r="18" fill="url(#auth-grad)" />
        <circle cx="440" cy="260" r="6" fill="currentColor" fillOpacity="0.7" />
        <circle cx="240" cy="380" r="14" fill="url(#auth-grad)" />
        <circle cx="240" cy="380" r="5" fill="currentColor" fillOpacity="0.6" />
        <circle cx="680" cy="420" r="22" fill="url(#auth-grad)" />
        <circle cx="680" cy="420" r="7" fill="currentColor" fillOpacity="0.8" />

        {/* Directional Velocity Chevron */}
        <path
          d="M 500 240 L 520 260 L 500 280"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.6"
        />
      </svg>
    </div>
  );
}

/**
 * 2. Merchant Momentum Stream
 * Upward volumetric curves, parcel flow ribbons, and dynamic growth vectors.
 */
export function MerchantIllustrationBg({ className, opacity = 0.4, ...props }: IllustrationBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
      style={{ opacity }}
      {...props}
    >
      <svg
        className="absolute -top-32 -right-32 h-[550px] w-[550px] text-emerald-500/15 sm:h-[700px] sm:w-[700px]"
        viewBox="0 0 700 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="stream-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Flow Ribbons */}
        <path
          d="M 50 650 C 200 500 350 550 500 350 S 650 150 700 80"
          stroke="url(#stream-grad)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 120 680 C 260 560 400 580 540 400 S 680 220 720 160"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="8 6"
          strokeOpacity="0.3"
        />

        {/* Isometric Parcel Contours */}
        <g transform="translate(480, 280) scale(0.9)" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.45" fill="none">
          <path d="M 40 10 L 80 30 L 40 50 L 0 30 Z" />
          <path d="M 0 30 L 0 70 L 40 90 L 40 50 Z" />
          <path d="M 40 50 L 40 90 L 80 70 L 80 30 Z" />
        </g>
        <g transform="translate(340, 420) scale(0.65)" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" fill="none">
          <path d="M 40 10 L 80 30 L 40 50 L 0 30 Z" />
          <path d="M 0 30 L 0 70 L 40 90 L 40 50 Z" />
          <path d="M 40 50 L 40 90 L 80 70 L 80 30 Z" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 3. Hub Sorting Radar
 * Concentric sorting concentric circles, barcode scanning rhythm lines, and hub zone sectors.
 */
export function HubIllustrationBg({ className, opacity = 0.45, ...props }: IllustrationBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
      style={{ opacity }}
      {...props}
    >
      <svg
        className="absolute -top-20 -right-20 h-[600px] w-[600px] text-cyan-600/15 sm:h-[750px] sm:w-[750px]"
        viewBox="0 0 750 750"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="500" cy="250" r="80" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
        <circle cx="500" cy="250" r="160" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.25" />
        <circle cx="500" cy="250" r="240" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
        <circle cx="500" cy="250" r="320" stroke="currentColor" strokeWidth="1" strokeDasharray="10 10" strokeOpacity="0.15" />

        {/* Crosshair Sweep Line */}
        <line x1="180" y1="250" x2="680" y2="250" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
        <line x1="500" y1="0" x2="500" y2="550" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />

        {/* Barcode Rhythm Grid */}
        <g transform="translate(420, 210)" stroke="currentColor" strokeOpacity="0.45">
          <line x1="0" y1="0" x2="0" y2="80" strokeWidth="2" />
          <line x1="6" y1="0" x2="6" y2="80" strokeWidth="5" />
          <line x1="16" y1="0" x2="16" y2="80" strokeWidth="2" />
          <line x1="22" y1="0" x2="22" y2="80" strokeWidth="7" />
          <line x1="34" y1="0" x2="34" y2="80" strokeWidth="2" />
          <line x1="42" y1="0" x2="42" y2="80" strokeWidth="4" />
          <line x1="52" y1="0" x2="52" y2="80" strokeWidth="2" />
          <line x1="60" y1="0" x2="60" y2="80" strokeWidth="6" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 4. Rider Topology Contour
 * Topographic GPS curves, street route polyline, and waypoint destination pin.
 */
export function RiderIllustrationBg({ className, opacity = 0.4, ...props }: IllustrationBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
      style={{ opacity }}
      {...props}
    >
      <svg
        className="absolute -top-28 -right-28 h-[600px] w-[600px] text-amber-500/15 sm:h-[750px] sm:w-[750px]"
        viewBox="0 0 750 750"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Topographic Elevation Contours */}
        <path
          d="M 200 100 C 350 80 500 180 620 120 S 740 300 700 450 C 660 600 520 620 380 650"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <path
          d="M 240 150 C 380 140 480 230 580 180 S 680 340 640 460 C 600 570 480 590 350 600"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 6"
          strokeOpacity="0.25"
        />
        <path
          d="M 280 200 C 390 190 460 270 540 230 S 620 360 590 440"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />

        {/* Active Rider Path */}
        <polyline
          points="200,500 280,440 320,340 440,310 500,210 560,190"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.5"
        />

        {/* Waypoint Pin */}
        <g transform="translate(560, 160)">
          <circle cx="0" cy="0" r="14" fill="currentColor" fillOpacity="0.2" />
          <circle cx="0" cy="0" r="6" fill="currentColor" fillOpacity="0.75" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 5. Customer Doorstep Shield
 * Trust shield silhouette, safe delivery concentric rings, and soft parcel heart.
 */
export function CustomerIllustrationBg({ className, opacity = 0.4, ...props }: IllustrationBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
      style={{ opacity }}
      {...props}
    >
      <svg
        className="absolute -top-24 -right-24 h-[580px] w-[580px] text-blue-500/15 sm:h-[720px] sm:w-[720px]"
        viewBox="0 0 720 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Shield Arc */}
        <path
          d="M 520 120 C 590 120 640 180 640 280 C 640 420 520 540 520 540 C 520 540 400 420 400 280 C 400 180 450 120 520 120 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
        <path
          d="M 520 170 C 570 170 600 210 600 290 C 600 390 520 480 520 480 C 520 480 440 390 440 290 C 440 210 470 170 520 170 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          strokeOpacity="0.2"
        />

        {/* Checkmark verification */}
        <path
          d="M 480 290 L 510 320 L 560 260"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.6"
        />
      </svg>
    </div>
  );
}
