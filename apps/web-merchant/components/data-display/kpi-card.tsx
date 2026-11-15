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

const TONE_TOP_LINE: Record<KpiTone, string> = {
  neutral: "via-muted-foreground/30",
  primary: "via-emerald-500/60",
  info: "via-cyan-500/60",
  success: "via-emerald-400/60",
  warning: "via-amber-500/60",
  danger: "via-rose-500/60",
};

const TONE_HOVER_BORDER: Record<KpiTone, string> = {
  neutral: "hover:border-border",
  primary: "hover:border-emerald-500/40",
  info: "hover:border-cyan-500/40",
  success: "hover:border-emerald-400/40",
  warning: "hover:border-amber-500/40",
  danger: "hover:border-rose-500/40",
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
 * Tactical Bento KPI Card.
 * Features top specular highlight line, watermark icon, frosted surface,
 * and kinetic hover micro-elevation inspired by the Home Hero bento.
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
        "group relative overflow-hidden rounded-3xl border border-border/70 dark:border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5",
        emphasis
          ? "bg-primary-soft/40 dark:bg-primary/10 hover:bg-primary-soft/60"
          : "bg-card/90 dark:bg-card/80 hover:bg-card",
        TONE_HOVER_BORDER[tone],
        className,
      )}
    >
      {/* 1. Top Specular Accent Line */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-75 group-hover:opacity-100 transition-opacity duration-300",
          TONE_TOP_LINE[tone],
        )}
      />

      {/* 2. Faint Watermark Icon */}
      <Icon
        className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 opacity-[0.04] dark:opacity-[0.07] transition-transform duration-300 group-hover:scale-110"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-caption font-bold uppercase tracking-wider text-muted-foreground">
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
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-105",
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
