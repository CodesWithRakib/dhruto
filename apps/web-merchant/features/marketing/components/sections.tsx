import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function Section({
  children,
  className,
  muted = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative py-16 sm:py-24", muted && "bg-surface-muted/20", className)}>
      <div className="dhruto-container relative z-10">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <div className={cn("inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary", align === "center" && "mx-auto")}>
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground text-balance">
        {title}
      </h2>
      {description ? (
        <p className="text-base sm:text-lg text-muted-foreground text-pretty leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureGrid({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.title}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-6 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-primary/50 hover:bg-surface/80 hover:-translate-y-1"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-body-sm text-muted-foreground text-pretty leading-relaxed">{item.description}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function StepFlow({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-6 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-primary/50 hover:bg-surface/80 hover:-translate-y-1.5"
        >
          {/* Top subtle glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-sm shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Step {index + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {step.title}
            </h3>
            <p className="mt-2 text-body-sm text-muted-foreground text-pretty leading-relaxed">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="mt-10 mx-auto max-w-3xl space-y-3.5">
      {items.map((item) => (
        <details
          key={item.question}
          className="group overflow-hidden rounded-2xl border border-border/50 bg-surface/50 backdrop-blur-xl transition-all duration-200 hover:border-primary/40 open:border-primary/50 open:bg-surface/75 shadow-md"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 text-base sm:text-lg font-bold text-foreground select-none">
            <span>{item.question}</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-surface-muted/50 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary group-open:bg-primary/10 group-open:border-primary/30"
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-border/30 mt-1">
            <p className="text-body text-muted-foreground leading-relaxed pt-3">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
