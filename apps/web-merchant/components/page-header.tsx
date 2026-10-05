import * as React from "react";
import { cn } from "@/lib/cn";

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
 * Canonical page heading. Gives every surface the same title size, spacing
 * and action alignment instead of each page inventing its own header.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 space-y-1.5", className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-1">
          <ol className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                ) : null}
                <span className={index === breadcrumbs.length - 1 ? "text-foreground" : undefined}>
                  {crumb.label}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-h1 text-foreground text-balance">{title}</h1>
          {description ? (
            <p className="text-body text-muted-foreground text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
