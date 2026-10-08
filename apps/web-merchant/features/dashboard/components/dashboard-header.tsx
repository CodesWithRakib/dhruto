"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Plus, Search } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";

/**
 * Overview welcome header.
 *
 * Deliberately small: greeting, factual date context and the two actions a
 * merchant needs most. Notification and profile affordances live in the top
 * bar, so they are not duplicated here.
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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {t("headerContext")} · <time dateTime={today}>{date(today)}</time>
          </span>
          {businessName ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate font-semibold text-foreground">{businessName}</span>
            </>
          ) : null}
        </div>

        <h1 className="text-balance text-h2 font-extrabold tracking-tight text-foreground sm:text-h1">
          {greeting}
        </h1>
        <p className="max-w-xl text-pretty text-body-sm text-muted-foreground">
          {t("dashboardSubtitle")}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link href={MERCHANT_ROUTES.tracking}>
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("trackParcel")}
          </Button>
        </Link>
        <Link href={MERCHANT_ROUTES.createBooking}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("bookNew")}
          </Button>
        </Link>
      </div>
    </header>
  );
}
