import React from "react";
import { Card } from "@dhruto/ui";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Semantic tones only — never raw colour scales. */
export type KpiTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

const TONE_SURFACE: Record<KpiTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: string;
  /**
   * Opt into a tinted, higher-emphasis surface. Used sparingly so one KPI can
   * lead a row instead of every card looking identical.
   */
  emphasis?: boolean;
  className?: string;
}

/**
 * One KPI presentation for every dashboard (merchant, admin, hub).
 * Uses contrast + typography instead of borders and shadows.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  emphasis = false,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "dhruto-animate-in transition-all duration-fast ease-out hover:shadow-soft",
        emphasis ? "border-primary/25 bg-primary-soft/40" : "bg-surface",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-h2 tabular-nums tracking-tight text-foreground">{value}</p>
          {hint ? (
            <p className="line-clamp-2 text-caption text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            TONE_SURFACE[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
