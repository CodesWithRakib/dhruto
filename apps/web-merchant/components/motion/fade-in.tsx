"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FadeInProps {
  children: React.ReactNode;
  /** Stagger index — each step adds ~60ms delay, capped for calm motion. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}

/**
 * Mount entrance for page sections and list rows. CSS-only, honors
 * `prefers-reduced-motion` via the global guard. Keep delays shallow —
 * motion should communicate hierarchy, not decorate.
 */
export function FadeIn({ children, delay = 0, className, as = "div" }: FadeInProps) {
  const Tag = as;
  const clamped = Math.min(Math.max(0, delay), 8);
  return (
    <Tag
      className={cn("dhruto-animate-in", className)}
      style={clamped > 0 ? { animationDelay: `${clamped * 60}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

export interface StaggerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Vertical stack whose direct children enter with a gentle stagger.
 * Works with any children — no per-item wiring needed.
 */
export function Stagger({ children, className }: StaggerProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, index) => (
        <FadeIn key={index} delay={Math.min(index, 8)}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
