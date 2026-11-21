import * as React from "react";
import { Card } from "@dhruto/ui";
import { cn } from "@/lib/cn";

/**
 * Card variants — surface hierarchy instead of borders/shadows.
 * `Card` stays the standard content container; these cover the rest.
 */

export function InteractiveCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn(
        "transition-all duration-fast ease-out hover:-translate-y-px focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function HighlightCard({
  children,
  tone = "primary",
  className,
}: {
  children: React.ReactNode;
  tone?: "primary" | "info" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-soft/30 text-foreground",
    info: "bg-info-soft/30 text-foreground",
    success: "bg-success-soft/30 text-foreground",
    warning: "bg-warning-soft/30 text-foreground",
    danger: "bg-danger-soft/30 text-foreground",
  } as const;
  return (
    <div className={cn("rounded-2xl p-4 sm:p-5 transition-colors", tones[tone], className)}>
      {children}
    </div>
  );
}

export function DeepCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dhruto-hero-dark relative overflow-hidden rounded-2xl p-6 sm:p-8", className)}>
      <div className="dhruto-route-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AlertCard({
  children,
  tone = "warning",
  className,
}: {
  children: React.ReactNode;
  tone?: "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    warning: "bg-warning-soft text-warning-soft-foreground",
    danger: "bg-danger-soft text-danger-soft-foreground",
    info: "bg-info-soft text-info-soft-foreground",
  } as const;
  return (
    <div role="alert" className={cn("rounded-xl px-4 py-3 text-body-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
