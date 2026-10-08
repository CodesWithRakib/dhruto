import * as React from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PageHeroStat {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  /** Primary/secondary actions rendered under the copy. */
  actions?: React.ReactNode;
  /** Optional right-hand visual for the split layout (visual, dashboard mock…). */
  media?: React.ReactNode;
  /** Small pill rendered above the title (trust badge, status, etc.). */
  badge?: React.ReactNode;
  align?: "start" | "center";
  tone?: "light" | "dark";
  /** Background photograph. Always combined with a readable overlay. */
  image?: { src: string; alt: string; priority?: boolean };
  stats?: PageHeroStat[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * The single visual entry point for public pages.
 *
 * Three compositions share one component so every page feels part of the same
 * product while still being able to open differently:
 *   - `align="center"` — statement hero (services, pricing, faq)
 *   - `align="start"` with `media` — split hero (about, contact)
 *   - `image` — photographic hero with a controlled dark overlay
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  media,
  badge,
  align = "center",
  tone = "light",
  image,
  stats,
  className,
  children,
}: PageHeroProps) {
  const isDark = tone === "dark" || Boolean(image);
  const isSplit = align === "start" && Boolean(media);

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden",
        isDark ? "dhruto-hero-dark" : "dhruto-hero-light",
        className,
      )}
    >
      {image ? (
        <div className="absolute inset-0 -z-10" aria-hidden={false}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="100vw"
            priority={image.priority}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/80" />
        </div>
      ) : (
        <div
          className="dhruto-route-pattern pointer-events-none absolute inset-0 -z-10 opacity-60"
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "dhruto-container relative py-14 sm:py-20 lg:py-24",
          align === "center" && "text-center",
        )}
      >
        <div
          className={cn(
            isSplit && "grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20",
          )}
        >
          <div
            className={cn(
              "max-w-2xl space-y-5",
              align === "center" && "mx-auto",
              isSplit && "max-w-none",
            )}
          >
            {badge ? <div className="flex">{badge}</div> : null}

            {eyebrow ? (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold",
                  isDark
                    ? "border-white/20 bg-white/10 text-white/90"
                    : "border-primary/25 bg-primary/10 text-primary",
                  align === "center" && "mx-auto",
                )}
              >
                <span>{eyebrow}</span>
              </div>
            ) : null}

            <h1
              className={cn(
                "text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl",
                isDark ? "text-white" : "text-foreground",
              )}
            >
              {title}
            </h1>

            {description ? (
              <p
                className={cn(
                  "text-base leading-relaxed text-pretty sm:text-lg",
                  isDark ? "text-white/75" : "text-muted-foreground",
                  align === "center" && "mx-auto max-w-xl",
                )}
              >
                {description}
              </p>
            ) : null}

            {actions ? (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-3 pt-1",
                  align === "center" && "justify-center",
                )}
              >
                {actions}
              </div>
            ) : null}

            {children ? (
              <div className={cn(align === "center" && "mx-auto max-w-2xl")}>{children}</div>
            ) : null}
          </div>

          {isSplit ? <div className="relative">{media}</div> : null}
        </div>

        {stats && stats.length > 0 ? (
          <dl
            className={cn(
              "mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
              align === "center" && "mx-auto max-w-4xl text-left",
            )}
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 backdrop-blur-sm",
                    isDark
                      ? "border-white/15 bg-white/5"
                      : "border-border/60 bg-surface/70 shadow-soft",
                  )}
                >
                  {Icon ? (
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        isDark
                          ? "bg-white/10 text-white"
                          : "bg-primary-soft text-primary-soft-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <dt
                      className={cn(
                        "text-xl font-extrabold tracking-tight sm:text-2xl",
                        isDark ? "text-white" : "text-foreground",
                      )}
                    >
                      {stat.value}
                    </dt>
                    <dd
                      className={cn(
                        "truncate text-caption font-medium",
                        isDark ? "text-white/70" : "text-muted-foreground",
                      )}
                    >
                      {stat.label}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
