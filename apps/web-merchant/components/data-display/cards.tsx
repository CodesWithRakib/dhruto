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
        "transition-all duration-fast ease-out hover:-translate-y-px hover:shadow-soft focus-within:shadow-soft focus-within:ring-2 focus-within:ring-ring/30",
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
    primary: "border-primary/20 bg-gradient-to-r from-primary-soft/50 via-primary-soft/20 to-transparent",
    info: "border-info/20 bg-gradient-to-r from-info-soft/50 via-info-soft/20 to-transparent",
    success: "border-success/20 bg-gradient-to-r from-success-soft/50 via-success-soft/20 to-transparent",
    warning: "border-warning/20 bg-gradient-to-r from-warning-soft/50 via-warning-soft/20 to-transparent",
    danger: "border-danger/20 bg-gradient-to-r from-danger-soft/50 via-danger-soft/20 to-transparent",
  } as const;
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5 shadow-2xs transition-colors", tones[tone], className)}>
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
    <div className={cn("dhruto-hero-dark relative overflow-hidden rounded-2xl p-6 shadow-soft sm:p-8", className)}>
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
    warning: "border-warning/30 bg-warning-soft text-warning-soft-foreground",
    danger: "border-danger/30 bg-danger-soft text-danger-soft-foreground",
    info: "border-info/30 bg-info-soft text-info-soft-foreground",
  } as const;
  return (
    <div role="alert" className={cn("rounded-xl border px-4 py-3 text-body-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
