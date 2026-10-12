"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, Compass, Plus, Search } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";

/**
 * Overview welcome header with enterprise aesthetics.
 * Features live status badge, calendar chip, verified merchant pill, and primary action buttons.
 */
export function DashboardHeader({
  today,
  businessName,
}: {
  /** ISO instant captured on the server so SSR and hydration agree. */
  today: string;
  businessName?: string;
}) {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { date } = useFormatters();

  const greeting = user?.name
    ? t("greeting", { name: user.name })
    : t("dashboardTitle");

  return (
    <header className="rounded-3xl border border-border/70 bg-gradient-to-r from-card via-card to-surface-muted/30 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>64 Districts Hub Network Active</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-0.5 text-muted-foreground font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <time dateTime={today}>{date(today)}</time>
            </span>

            {businessName ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{businessName}</span>
              </span>
            ) : null}
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {greeting}
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("dashboardSubtitle")}
          </p>
        </div>

        {/* Quick action triggers */}
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link href="/workflow">
            <Button variant="secondary" className="gap-2 shadow-2xs hover:shadow-xs text-xs font-semibold">
              <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Operations Guide</span>
            </Button>
          </Link>
          <Link href={MERCHANT_ROUTES.tracking}>
            <Button variant="outline" className="gap-2 shadow-2xs hover:shadow-xs text-xs font-semibold">
              <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{t("trackParcel")}</span>
            </Button>
          </Link>
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button className="gap-2 shadow-sm hover:shadow-md hover:shadow-primary/20 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("bookNew")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
