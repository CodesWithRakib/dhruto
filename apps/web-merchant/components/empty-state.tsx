import * as React from "react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `error` tints the icon with the danger token. */
  tone?: "neutral" | "error";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            tone === "error"
              ? "bg-danger-soft text-danger-soft-foreground"
              : "bg-surface-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-h4 text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-body text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
