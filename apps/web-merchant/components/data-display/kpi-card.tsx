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
 * Features hover micro-elevation, rounded-2xl curvature, and semantic icon badge.
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
        "dhruto-animate-in rounded-2xl transition-all duration-200 hover:-translate-y-0.5",
        emphasis
          ? "bg-primary-soft/40 hover:bg-primary-soft/60"
          : "bg-card hover:bg-surface-muted/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="line-clamp-2 text-caption text-muted-foreground leading-relaxed">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-2xs",
            TONE_SURFACE[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}
