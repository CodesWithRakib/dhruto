import * as React from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/cn";

export interface CTAAction {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export interface CTASectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primary?: CTAAction;
  secondary?: CTAAction;
  note?: string;
  className?: string;
}

/**
 * Shared pre-footer conversion band used across the public site.
 * Deep-forest surface with a single radial glow — no heavy imagery.
 */
export function CTASection({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  note,
  className,
}: CTASectionProps) {
  const PrimaryIcon = primary?.icon;
  const SecondaryIcon = secondary?.icon;

  return (
    <section className={cn("relative py-16 sm:py-24", className)}>
      <div className="dhruto-container">
        <div className="dhruto-hero-dark relative overflow-hidden rounded-3xl border border-white/10 px-6 py-12 text-center shadow-lift sm:px-12 sm:py-16">
          <div
            className="dhruto-route-pattern pointer-events-none absolute inset-0 opacity-40"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-2xl space-y-4">
            {eyebrow ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/90">
                <span>{eyebrow}</span>
              </div>
            ) : null}

            <h2 className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl">
              {title}
            </h2>

            {description ? (
              <p className="mx-auto max-w-xl text-base leading-relaxed text-pretty text-white/75 sm:text-lg">
                {description}
              </p>
            ) : null}

            {primary || secondary ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {primary ? (
                  <Link href={primary.href}>
                    <Button size="lg" className="h-12 rounded-xl px-6 font-bold shadow-lg shadow-black/20">
                      {PrimaryIcon ? <PrimaryIcon className="h-4 w-4" aria-hidden="true" /> : null}
                      {primary.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                ) : null}
                {secondary ? (
                  <Link href={secondary.href}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 rounded-xl border-white/25 bg-white/5 px-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                    >
                      {SecondaryIcon ? <SecondaryIcon className="h-4 w-4" aria-hidden="true" /> : null}
                      {secondary.label}
                    </Button>
                  </Link>
                ) : null}
              </div>
            ) : null}

            {note ? <p className="pt-1 text-caption text-white/60">{note}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export interface StatItem {
  value: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
}

export function StatBand({
  stats,
  className,
}: {
  stats: StatItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/70 p-4 shadow-soft backdrop-blur-sm transition-colors hover:border-primary/40 sm:p-5"
          >
            <div className="flex items-center gap-3">
              {Icon ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              ) : null}
              <div className="min-w-0">
                <dt className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {stat.value}
                </dt>
                <dd className="truncate text-caption font-medium text-muted-foreground">
                  {stat.label}
                </dd>
              </div>
            </div>
            {stat.hint ? (
              <p className="mt-2 text-[11px] text-muted-foreground/80">{stat.hint}</p>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}

export interface ShowcaseItem {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  image?: { src: string; alt: string };
  icon?: LucideIcon;
  reverse?: boolean;
}

/**
 * Alternating image/text rows. Used by Services and About to tell a story
 * section-by-section instead of dropping a wall of identical cards.
 */
export function FeatureShowcase({ items }: { items: ShowcaseItem[] }) {
  return (
    <div className="mt-14 space-y-16 sm:space-y-20">
      {items.map((item, index) => {
        const Icon = item.icon;
        const mediaFirst = item.reverse ?? index % 2 === 1;
        return (
          <div
            key={item.title}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
          >
            <div className={cn("space-y-4", mediaFirst && "lg:order-2")}>
              {item.eyebrow ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                  {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {item.eyebrow}
                </div>
              ) : null}
              <h3 className="text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl">
                {item.title}
              </h3>
              <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                {item.description}
              </p>
              {item.bullets && item.bullets.length > 0 ? (
                <ul className="space-y-2.5 pt-1">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-body text-foreground/90">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className={cn("relative", mediaFirst && "lg:order-1")}>
              <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-lift">
                {item.image ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-muted">
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dhruto-route-pattern flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-primary-soft/40">
                    {Icon ? <Icon className="h-12 w-12 text-primary" aria-hidden="true" /> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
