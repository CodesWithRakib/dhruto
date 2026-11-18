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
        <div className={cn("inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary", align === "center" && "mx-auto")}>
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
            className="group relative overflow-hidden rounded-2xl bg-surface/50 p-6 backdrop-blur-xl transition-all duration-300 hover:bg-surface/80 hover:-translate-y-1"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
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

const STEP_ICONS = [
  <svg key="1" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]"><path d="M9 4h6v3H9z"/><path d="M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H15"/><path d="M9 12h6M9 16h4"/></svg>,
  <svg key="2" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M9 9v11"/></svg>,
  <svg key="3" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>,
  <svg key="4" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]"><path d="M12 3 5 6v5.5c0 4.3 2.9 7.7 7 9.5 4.1-1.8 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15 10.4"/></svg>,
  <svg key="5" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]"><path d="M5 21V4M5 4h12l-2.5 4 2.5 4H5"/></svg>,
];

const STEP_TAGS = ["API Manifest", "60-Min Pickup", "Cross-Dock Sort", "Doorstep Delivery", "Instant COD Payout"];

export function StepFlow({ steps }: { steps: { title: string; description: string }[] }) {
  const displaySteps = steps.slice(0, 5);

  return (
    <div className="steps relative" id="steps">
      {/* Desktop Curved Wavy Connector */}
      <div className="wv" aria-hidden="true">
        <svg className="off" viewBox="0 0 1000 166" preserveAspectRatio="none">
          <path d="M100 39C200 39 200 127 300 127S400 39 500 39 600 127 700 127 800 39 900 39" />
        </svg>
        <svg className="on" viewBox="0 0 1000 166" preserveAspectRatio="none">
          <path d="M100 39C200 39 200 127 300 127S400 39 500 39 600 127 700 127 800 39 900 39" />
        </svg>
      </div>

      {/* Mobile straight line */}
      <span className="pline" aria-hidden="true">
        <i />
      </span>

      {displaySteps.map((step, index) => {
        const isEnd = index === displaySteps.length - 1;
        const icon = STEP_ICONS[index] ?? STEP_ICONS[0];
        const tag = STEP_TAGS[index] ?? `Step ${index + 1}`;

        return (
          <div key={step.title} className={cn("st", isEnd && "end")}>
            <div className="nd">
              {icon}
              <b>{index + 1}</b>
            </div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span className="stag">{tag}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="mt-10 mx-auto max-w-3xl space-y-3.5">
      {items.map((item) => (
        <details
          key={item.question}
          className="group overflow-hidden rounded-2xl bg-surface/50 backdrop-blur-xl transition-all duration-200 open:bg-surface/75"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 text-base sm:text-lg font-bold text-foreground select-none">
            <span>{item.question}</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-muted/50 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary group-open:bg-primary/10"
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 mt-1">
            <p className="text-body text-muted-foreground leading-relaxed pt-3">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
