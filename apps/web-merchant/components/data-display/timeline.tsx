import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/config/status";

export type TimelineTone = StatusTone | "primary";

const DOT_TONES: Record<TimelineTone, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
  neutral: "bg-surface-elevated text-muted-foreground border border-border/80",
  info: "bg-info-soft text-info-soft-foreground border border-info/30",
  success: "bg-success-soft text-success-soft-foreground border border-success/30",
  warning: "bg-warning-soft text-warning-soft-foreground border border-warning/30",
  danger: "bg-danger-soft text-danger-soft-foreground border border-danger/30",
};

export interface TimelineProps {
  children: React.ReactNode;
  /** Accessible name, e.g. "Delivery timeline". */
  label: string;
  className?: string;
}

/**
 * The one vertical timeline for tracking events, parcel history and task
 * activity. Centered rail + dots, clean typography, metadata as children.
 */
export function Timeline({ children, label, className }: TimelineProps) {
  return (
    <ol aria-label={label} className={cn("relative space-y-0", className)}>
      {children}
    </ol>
  );
}

export interface TimelineItemProps {
  title: React.ReactNode;
  /** Formatted timestamp text; rendered in a <time> when dateTime is given. */
  timestamp?: React.ReactNode;
  dateTime?: string;
  tone?: TimelineTone;
  icon?: React.ReactNode;
  current?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function TimelineItem({
  title,
  timestamp,
  dateTime,
  tone = "neutral",
  icon,
  current,
  children,
  className,
}: TimelineItemProps) {
  return (
    <li
      className={cn("group relative flex items-start gap-4 sm:gap-5", className)}
      aria-current={current ? "step" : undefined}
    >
      {/* Left rail column: icon dot + centered connecting vertical line */}
      <div className="relative flex flex-col items-center self-stretch shrink-0">
        {/* Circle Dot */}
        <div
          aria-hidden="true"
          className={cn(
            "relative z-10 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-xs transition-all duration-200",
            DOT_TONES[tone],
            current && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
          )}
        >
          {icon ?? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" aria-hidden="true" />}
        </div>
        {/* Centered vertical connecting line to next item */}
        <div aria-hidden="true" className="w-0.5 flex-1 bg-border/80 group-last:hidden" />
      </div>

      {/* Right content column */}
      <div className="flex-1 min-w-0 pb-8 group-last:pb-2 pt-0.5 sm:pt-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <div className="text-body font-bold text-foreground leading-snug">{title}</div>
          {timestamp ? (
            dateTime ? (
              <time
                dateTime={dateTime}
                className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground"
              >
                {timestamp}
              </time>
            ) : (
              <span className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">
                {timestamp}
              </span>
            )
          ) : null}
        </div>
        {children}
      </div>
    </li>
  );
}
