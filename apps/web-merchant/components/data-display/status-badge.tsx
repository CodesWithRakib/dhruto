"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { ParcelStatus } from "@dhruto/contracts";
import { statusConfig, TONE_CLASSES } from "@/config/status";
import { cn } from "@/lib/cn";

export interface StatusBadgeProps {
  status: ParcelStatus | string;
  /** Show the status icon before the label. */
  withIcon?: boolean;
  className?: string;
}

/**
 * The one way a parcel status is displayed across lists, details, tracking
 * and dashboards. Colour and wording come from `config/status.ts`.
 */
export function StatusBadge({ status, withIcon = false, className }: StatusBadgeProps) {
  const t = useTranslations("ParcelStatus");
  const { labelKey, tone, icon: Icon } = statusConfig(status as ParcelStatus);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {withIcon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {t(labelKey)}
    </span>
  );
}
