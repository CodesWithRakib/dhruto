import * as React from "react";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/navigation";
import Image from "next/image";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Right-aligned action slot (primary + secondary actions). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Canonical page heading. Upgraded to a branded banner with deep forest theme.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("dhruto-hero-dark relative mb-6 overflow-hidden rounded-2xl p-6 shadow-soft sm:mb-8 sm:p-8", className)}>
      {/* Background illustration */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 md:block" aria-hidden="true">
        <Image
          src="/images/dashboard-banner.jpg"
          alt=""
          fill
          className="object-cover object-right [mask-image:linear-gradient(to_left,black,transparent)] mix-blend-overlay"
        />
      </div>
      {/* Subtle route pattern overlay */}
      <div className="dhruto-route-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative z-10 flex flex-col gap-4">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--hero-dark-muted))]">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-[hsl(var(--hero-dark-muted)/0.6)]">
                        /
                      </span>
                    ) : null}
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="rounded transition-colors hover:text-[hsl(var(--hero-dark-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--hero-dark-accent))]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-[hsl(var(--hero-dark-foreground))]" : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl space-y-2">
            <h1 className="text-balance text-h1 font-extrabold tracking-tight text-[hsl(var(--hero-dark-foreground))] sm:text-display">{title}</h1>
            {description ? (
              <p className="text-pretty text-body-sm leading-relaxed text-[hsl(var(--hero-dark-muted))]">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--hero-dark-foreground)/0.12)] bg-[hsl(var(--hero-dark-foreground)/0.06)] p-1.5 backdrop-blur-sm">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
