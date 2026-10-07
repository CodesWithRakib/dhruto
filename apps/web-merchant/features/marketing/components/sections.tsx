import * as React from "react";
import type { LucideIcon } from "lucide-react";
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
    <section id={id} className={cn("py-14 sm:py-20", muted && "bg-surface-muted/60", className)}>
      <div className="dhruto-container">{children}</div>
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
    <div className={cn("max-w-2xl space-y-2", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="dhruto-eyebrow">{eyebrow}</p> : null}
      <h2 className="text-h2 text-foreground text-balance">{title}</h2>
      {description ? (
        <p className="text-body text-muted-foreground text-pretty">{description}</p>
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
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.title} className="rounded-lg border border-border bg-surface p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-h4 text-foreground">{item.title}</h3>
            <p className="mt-1 text-body text-muted-foreground text-pretty">{item.description}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function StepFlow({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-lg border border-border bg-surface p-5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground">
            {index + 1}
          </span>
          <h3 className="mt-3 text-h4 text-foreground">{step.title}</h3>
          <p className="mt-1 text-body-sm text-muted-foreground text-pretty">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-h4 text-foreground">
            {item.question}
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-2 text-body text-muted-foreground text-pretty">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
