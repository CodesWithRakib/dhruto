import * as React from "react";
import { cn } from "@/lib/cn";
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
    <header className={cn("relative mb-8 overflow-hidden rounded-2xl border border-emerald-950/20 bg-emerald-950 dhruto-hero-dark p-6 sm:p-8 shadow-xl shadow-emerald-950/10", className)}>
      {/* Background illustration */}
      <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none hidden md:block opacity-60">
        <Image
          src="/images/dashboard-banner.jpg"
          alt=""
          fill
          className="object-cover object-right [mask-image:linear-gradient(to_left,black,transparent)] mix-blend-overlay"
        />
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-emerald-100/70">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-emerald-100/40">
                      /
                    </span>
                  ) : null}
                  <span className={index === breadcrumbs.length - 1 ? "text-white font-medium" : undefined}>
                    {crumb.label}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white text-balance">{title}</h1>
            {description ? (
              <p className="text-sm text-emerald-100/80 text-pretty leading-relaxed">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl bg-white/5 p-1.5 backdrop-blur-sm border border-white/10">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
