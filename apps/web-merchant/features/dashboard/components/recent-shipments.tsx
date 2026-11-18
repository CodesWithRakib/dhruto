"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  ListSkeleton,
} from "@dhruto/ui";
import { ArrowRight, ChevronRight, MapPin, Package } from "lucide-react";
import type { ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useFormatters } from "@/lib/format";
import { MERCHANT_ROUTES } from "@/config/routes";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState, RetryButton } from "@/components/feedback/states";

export interface ShipmentRow {
  id: string;
  trackingCode: string;
  recipientName: string;
  district: string;
  thana?: string;
  status: ParcelStatus | string;
  codAmount: number;
  createdAt: string;
}

function destination(row: ShipmentRow): string {
  return [row.district, row.thana].filter(Boolean).join(", ") || "—";
}

/**
 * Recent shipments.
 *
 * Not a data grid: on phones each shipment becomes a self-contained card so
 * there is never a horizontal scroll, and on desktop the same records line up
 * in a table-style row with a shared header.
 */
export function RecentShipments({
  rows,
  isLoading,
  isError,
  onRetry,
}: {
  rows: ShipmentRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("Index");
  const { bdt, dateTime } = useFormatters();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card/90 backdrop-blur-md">
      {/* Top Specular Accent Line */}

      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-5 py-4.5 bg-surface-muted/30 sm:px-6">
        <div className="min-w-0">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">{t("recentOrders")}</CardTitle>
          <CardDescription className="mt-0.5 text-xs text-muted-foreground">{t("recentOrdersSubtitle")}</CardDescription>
        </div>
        <Link href={MERCHANT_ROUTES.parcels} className="shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary-soft/60">
            {t("viewAll")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 sm:p-5">
            <ListSkeleton rows={5} />
          </div>
        ) : isError ? (
          <ErrorState
            title={t("recentErrorTitle")}
            description={t("recentErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={onRetry} />}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("emptyRecentTitle")}
            description={t("emptyRecentDescription")}
            action={
              <Link href={MERCHANT_ROUTES.createBooking}>
                <Button size="sm" className="rounded-xl">{t("bookNew")}</Button>
              </Link>
            }
          />
        ) : (
          <ul>
            {rows.map((row) => {
              const href = MERCHANT_ROUTES.parcel(row.id);
              return (
                <li key={row.id}>
                  <Link
                    href={href}
                    className="group block px-4 py-3.5 transition-all duration-200 hover:bg-surface-muted/60 focus-visible:bg-surface-muted/60 sm:px-5"
                    aria-label={`${row.trackingCode} — ${row.recipientName}`}
                  >
                    {/* Mobile: stacked card */}
                    <div className="flex items-start justify-between gap-3 sm:hidden">
                      <div className="min-w-0">
                        <span className="inline-flex items-center rounded-lg bg-primary-soft px-2 py-0.5 font-mono text-xs font-bold text-primary">
                          {row.trackingCode}
                        </span>
                        <p className="mt-1.5 truncate text-xs font-semibold text-foreground">
                          {row.recipientName}
                        </p>
                      </div>
                      <StatusBadge status={row.status} withIcon />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-caption text-muted-foreground sm:hidden">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                        <span className="truncate">{destination(row)}</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-foreground">
                        {bdt(row.codAmount)}
                      </span>
                    </div>

                    {/* Desktop: table-style row */}
                    <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                      <div className="min-w-0 sm:col-span-3">
                        <span className="inline-flex items-center rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-xs font-bold text-primary transition-colors">
                          {row.trackingCode}
                        </span>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {dateTime(row.createdAt)}
                        </p>
                      </div>
                      <div className="min-w-0 sm:col-span-3">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {row.recipientName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="truncate">{destination(row)}</span>
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="sm:col-span-2 text-right">
                        <span className="tabular-nums text-sm font-bold text-foreground">
                          {bdt(row.codAmount)}
                        </span>
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end gap-1.5 text-xs font-semibold text-primary">
                        <span>{t("view")}</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft/60 group-hover:bg-primary group-hover:text-white transition-all">
                          <ChevronRight
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </div>
  );
}
