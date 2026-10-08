import React from "react";
import {
  AlertTriangle,
  Inbox,
  Loader2,
  RefreshCw,
  SearchX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { cn } from "@/lib/cn";

/**
 * Dhruto — centralized async UI states.
 * ------------------------------------------------------------------
 * Every async surface (public, merchant, hub, rider, admin) renders loading,
 * empty, error and offline states through these components so no page invents
 * its own spinner or empty illustration.
 *
 * They are presentational: callers pass already-translated strings, which
 * keeps them usable from both server and client components.
 */
export interface StateViewProps {
  title?: string;
  description?: string;
  className?: string;
  /** Optional action, e.g. a retry button or a link. */
  action?: React.ReactNode;
}

function Frame({
  icon,
  tone = "neutral",
  title,
  description,
  action,
  className,
  alert,
}: StateViewProps & {
  icon: React.ReactNode;
  tone?: "neutral" | "danger" | "warning";
  alert?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "bg-danger-soft text-danger-soft-foreground"
      : tone === "warning"
        ? "bg-warning-soft text-warning-soft-foreground"
        : "bg-surface-muted text-muted-foreground";

  return (
    <div
      role={alert ? "alert" : "status"}
      className={cn(
        "dhruto-animate-in flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", toneClass)}>
        {icon}
      </span>
      {title ? <p className="text-h4 text-balance text-foreground">{title}</p> : null}
      {description ? (
        <p className="max-w-md text-body-sm text-pretty text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title, description, className }: StateViewProps) {
  return (
    <Frame
      className={className}
      title={title}
      description={description}
      icon={<Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
    />
  );
}

export interface EmptyStateProps extends StateViewProps {
  /** Lucide icon component (not an element), so callers stay terse. */
  icon?: LucideIcon;
  /** `error` tints the icon with the danger token. */
  tone?: "neutral" | "error";
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon: Icon = Inbox,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <Frame
      className={className}
      tone={tone === "error" ? "danger" : "neutral"}
      title={title}
      description={description}
      action={action}
      icon={<Icon className="h-5 w-5" aria-hidden="true" />}
    />
  );
}

export function ErrorState({ title, description, action, className }: StateViewProps) {
  return (
    <Frame
      className={className}
      tone="danger"
      alert
      title={title}
      description={description}
      action={action}
      icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
    />
  );
}

export function OfflineState({ title, description, action, className }: StateViewProps) {
  return (
    <Frame
      className={className}
      tone="warning"
      title={title}
      description={description}
      action={action}
      icon={<WifiOff className="h-5 w-5" aria-hidden="true" />}
    />
  );
}

export function NotFoundState({ title, description, action, className }: StateViewProps) {
  return (
    <Frame
      className={className}
      title={title}
      description={description}
      action={action}
      icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
    />
  );
}

/** Retry button pre-wired to a callback, for use inside ErrorState. */
export function RetryButton({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
