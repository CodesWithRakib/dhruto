"use client";

import React from "react";
import { TONE_CLASSES, type StatusTone } from "@/config/status";
import { cn } from "@/lib/cn";

export interface ToneBadgeProps {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic semantic badge for non-parcel statuses (payout states, attempt
 * outcomes, DLQ states…). Same tone classes as StatusBadge, so a tone looks
 * identical everywhere. Parcel statuses must keep using StatusBadge.
 */
export function ToneBadge({ tone, children, className }: ToneBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
