import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/config/status";

export type TimelineTone = StatusTone | "primary";

const DOT_TONES: Record<TimelineTone, string> = {
  primary: "bg-primary text-primary-foreground",
  neutral: "bg-surface-muted text-muted-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

export interface TimelineProps {
  children: React.ReactNode;
  /** Accessible name, e.g. "Delivery timeline". */
  label: string;
  className?: string;
}

/**
 * The one vertical timeline for tracking events, parcel history and task
 * activity. Rail + dots, compact timestamps, metadata as children.
 */
export function Timeline({ children, label, className }: TimelineProps) {
  return (
    <ol aria-label={label} className={cn("relative ml-2 space-y-8 border-l-2 border-border/70 pb-2 pl-6", className)}>
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
      className={cn("relative", className)}
      aria-current={current ? "step" : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center rounded-full",
          DOT_TONES[tone],
        )}
      >
        {icon ?? <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      </span>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-body font-bold text-foreground">{title}</span>
        {timestamp ? (
          dateTime ? (
            <time dateTime={dateTime} className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">
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
    </li>
  );
}
