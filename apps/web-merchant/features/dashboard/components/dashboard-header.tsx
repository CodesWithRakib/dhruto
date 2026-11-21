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
    <header className="relative overflow-hidden rounded-2xl bg-inverse p-6 sm:p-7 text-white">
      {/* 1. Coordinate Grid Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,#000_30%,transparent_100%)]"
      />

      {/* 2. Top-Left & Bottom-Right Ambient Radial Glow Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-brand/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Calendar Chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80 backdrop-blur-md">
              <CalendarDays className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <time dateTime={today}>{date(today)}</time>
            </span>

            {/* Verified Merchant Badge */}
            {businessName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 font-semibold text-brand backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="truncate max-w-[200px]">{businessName}</span>
              </span>
            ) : null}
          </div>

          {/* Executive Greeting */}
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight">
            {greeting}
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
            {t("dashboardSubtitle")}
          </p>
        </div>

        {/* Quick Action Triggers */}
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link href="/workflow">
            <Button
              variant="outline"
              className="gap-2 rounded-2xl bg-white/10 text-white backdrop-blur-md hover:bg-white/20 text-xs font-semibold transition-all duration-200"
            >
              <Compass className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span>Operations Guide</span>
            </Button>
          </Link>
          <Link href={MERCHANT_ROUTES.tracking}>
            <Button
              variant="outline"
              className="gap-2 rounded-2xl bg-white/10 text-white backdrop-blur-md hover:bg-white/20 text-xs font-semibold transition-all duration-200"
            >
              <Search className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
              <span>{t("trackParcel")}</span>
            </Button>
          </Link>
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button
              className="gap-2 rounded-2xl bg-brand text-inverse hover:bg-primary-soft font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              <span>{t("bookNew")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
