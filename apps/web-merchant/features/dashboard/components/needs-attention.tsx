"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CardSkeleton } from "@dhruto/ui";
import { ArrowRight, Clock, RotateCcw, Wallet, type LucideIcon } from "lucide-react";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";
import { MERCHANT_ROUTES } from "@/config/routes";
import type { AttentionItem, AttentionKey } from "../lib/overview";

const ROW_CONFIG: Record<
  AttentionKey,
  {
    icon: LucideIcon;
    tone: string;
    titleKey: string;
    descriptionKey: string;
    href: string;
    ctaKey: string;
  }
> = {
  pending: {
    icon: Clock,
    tone: "bg-warning-soft text-warning-soft-foreground",
    titleKey: "attention.pendingTitle",
    descriptionKey: "attention.pendingDesc",
    href: MERCHANT_ROUTES.parcels,
    ctaKey: "attention.viewParcels",
  },
  returned: {
    icon: RotateCcw,
    tone: "bg-danger-soft text-danger-soft-foreground",
    titleKey: "attention.rtoTitle",
    descriptionKey: "attention.rtoDesc",
    href: MERCHANT_ROUTES.parcels,
    ctaKey: "attention.viewParcels",
  },
  cod: {
    icon: Wallet,
    tone: "bg-info-soft text-info-soft-foreground",
    titleKey: "attention.codTitle",
    descriptionKey: "attention.codDesc",
    href: MERCHANT_ROUTES.finance,
    ctaKey: "attention.viewFinance",
  },
};

/**
 * Only rendered when at least one real, actionable count exists. Uses a single
 * amber accent for the section and per-row semantic icon chips rather than
 * colouring the whole panel.
 */
export function NeedsAttention({
  items,
  isLoading,
}: {
  items: AttentionItem[];
  isLoading: boolean;
}) {
  const t = useTranslations("Index");
  const { bdt, number } = useFormatters();

  if (isLoading) {
    return <CardSkeleton className="h-40" />;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-card/90 dark:bg-card/75 backdrop-blur-md shadow-xs">
      {/* Top Specular Accent Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      <div className="flex items-start gap-3.5 border-b border-amber-500/20 bg-amber-500/10 px-5 py-4 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
          <Clock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {t("attention.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("attention.description")}</p>
        </div>
      </div>

      <ul className="divide-y divide-border/50">
        {items.map((item) => {
          const config = ROW_CONFIG[item.key];
          const Icon = config.icon;
          return (
            <li key={item.key}>
              <Link
                href={config.href}
                className="group flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 hover:bg-surface-muted/60 sm:px-5"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/20 shadow-2xs",
                    config.tone,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t(config.titleKey)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.key === "cod"
                      ? t(config.descriptionKey, { amount: bdt(item.amount ?? 0) })
                      : t(config.descriptionKey, { count: number(item.count) })}
                  </p>
                </div>

                <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-primary sm:inline-flex">
                  <span>{t(config.ctaKey)}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft/60 group-hover:bg-primary group-hover:text-white transition-all">
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
