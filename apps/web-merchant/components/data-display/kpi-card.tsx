import React from "react";
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
 * KPI card: flat surface (no border, shadow or edge lines), tinted icon chip
 * and a faint watermark icon. `emphasis` swaps to the primary-soft surface.
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-5 sm:p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1",
        emphasis
          ? "bg-primary-soft/40 hover:bg-primary-soft/60"
          : "bg-card/90 hover:bg-card",
        className,
      )}
    >
      {/* 2. Faint Watermark Icon */}
      <Icon
        className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 opacity-[0.04] transition-transform duration-300 group-hover:scale-110"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {/* Wrap (max 2 lines) instead of truncating: on 5-up rows labels like
              "Returns & RTO" were cut to "RETURNS & RT…". */}
          <p className="line-clamp-2 text-caption font-bold uppercase leading-snug tracking-wide text-muted-foreground" title={label}>
            {label}
          </p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="line-clamp-2 text-caption text-muted-foreground leading-relaxed font-normal">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11",
            TONE_SURFACE[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
