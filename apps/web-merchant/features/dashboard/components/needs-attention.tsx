"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardSkeleton } from "@dhruto/ui";
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
    <Card className="overflow-hidden border-warning/30">
      <div className="flex items-start gap-3 border-b border-warning/20 bg-warning-soft/30 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-soft-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-h4 font-bold text-foreground">{t("attention.title")}</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">{t("attention.description")}</p>
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
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/50 sm:px-5"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    config.tone,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-foreground">
                    {t(config.titleKey)}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {item.key === "cod"
                      ? t(config.descriptionKey, { amount: bdt(item.amount ?? 0) })
                      : t(config.descriptionKey, { count: number(item.count) })}
                  </p>
                </div>

                <span className="hidden shrink-0 items-center gap-1 text-caption font-semibold text-primary sm:inline-flex">
                  {t(config.ctaKey)}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
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
    </Card>
  );
}
