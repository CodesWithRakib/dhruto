"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { resolveTone, type StatusTone } from "@/config/status";
import { ToneBadge } from "./tone-badge";

export interface EnumBadgeProps {
  /** Message namespace holding the value's label, e.g. `PayoutStatus`. */
  namespace: string;
  /** Raw enum / wire value, e.g. `COMPLETED`. */
  value: string;
  /** Tone map from `@/config/status`; unknown values fall back to neutral. */
  tones: Record<string, StatusTone>;
  className?: string;
}

/**
 * The single way a non-parcel status enum is displayed. Pairing one shared tone
 * map with one shared message namespace means the same value always renders the
 * same colour and the same word on lists, details and dashboards.
 */
export function EnumBadge({ namespace, value, tones, className }: EnumBadgeProps) {
  const t = useTranslations(namespace);
  const label = t.has(value) ? t(value) : value;
  return (
    <ToneBadge tone={resolveTone(tones, value)} className={className}>
      {label}
    </ToneBadge>
  );
}
