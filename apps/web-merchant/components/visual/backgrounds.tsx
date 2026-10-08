import * as React from "react";
import { cn } from "@/lib/cn";

export interface DeepBackgroundProps {
  children: React.ReactNode;
  /** `dark` = Deep Forest hero, `light` = Mint Mist section wash. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * Branded section surface for heroes, auth, dashboard highlights and premium
 * empty states. CSS gradients only — no images, no blur cost.
 */
export function DeepBackground({ children, tone = "dark", className }: DeepBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        tone === "dark" ? "dhruto-hero-dark" : "dhruto-hero-light",
        className,
      )}
    >
      <div className="dhruto-route-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-48",
        "bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,hsl(var(--primary)/0.12),transparent_70%)]",
        className,
      )}
    />
  );
}

export function RoutePattern({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("dhruto-route-pattern pointer-events-none absolute inset-0", className)} />;
}

export function GridPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0",
        "bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)]",
        "bg-[size:28px_28px]",
        "[mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent_75%)]",
        className,
      )}
    />
  );
}
