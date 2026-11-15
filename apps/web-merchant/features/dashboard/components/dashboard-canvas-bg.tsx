"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface DashboardCanvasBgProps extends React.HTMLAttributes<HTMLDivElement> {
  opacity?: number;
}

/**
 * Atmospheric Tactical Backdrop for the Merchant Dashboard.
 * Integrates precision coordinate dot grid, dual ambient radial blooms,
 * and logistics velocity ribbons inspired by the Home Hero.
 */
export function DashboardCanvasBg({ className, opacity = 1, ...props }: DashboardCanvasBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none -z-10", className)}
      style={{ opacity }}
      {...props}
    >
      {/* 1. Precision Coordinate Dot Grid with Radial Falloff */}
      <div
        className="absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_15%,#000_25%,transparent_100%)]"
      />

      {/* 2. Top-Right Ambient Radial Glow Bloom */}
      <div
        className="absolute -top-40 -right-40 h-[680px] w-[680px] rounded-full blur-3xl opacity-40 dark:opacity-25"
        style={{
          background:
            "radial-gradient(closest-side, rgba(var(--glow-rgb, 16 185 129), 0.75), rgba(var(--glow-rgb, 16 185 129), 0.25) 45%, transparent)",
        }}
      />

      {/* 3. Bottom-Left Ambient Radial Glow Bloom */}
      <div
        className="absolute top-[40%] -left-40 h-[580px] w-[580px] rounded-full blur-3xl opacity-25 dark:opacity-15"
        style={{
          background:
            "radial-gradient(closest-side, rgba(6, 182, 212, 0.55), rgba(16, 185, 129, 0.2) 50%, transparent)",
        }}
      />

      {/* 4. Velocity Vectors & Isometric Parcel Flow */}
      <svg
        className="absolute top-0 right-0 h-[700px] w-[700px] text-emerald-500/10 dark:text-emerald-400/5"
        viewBox="0 0 700 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 50 650 C 200 500 350 550 500 350 S 650 150 700 80"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 120 680 C 260 560 400 580 540 400 S 680 220 720 160"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <g transform="translate(480, 260) scale(0.85)" stroke="currentColor" strokeWidth="1.6" fill="none">
          <path d="M 40 10 L 80 30 L 40 50 L 0 30 Z" />
          <path d="M 0 30 L 0 70 L 40 90 L 40 50 Z" />
          <path d="M 40 50 L 40 90 L 80 70 L 80 30 Z" />
        </g>
      </svg>
    </div>
  );
}
