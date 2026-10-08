"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <CardTitle className="text-h4">{t("recentOrders")}</CardTitle>
          <CardDescription className="mt-0.5">{t("recentOrdersSubtitle")}</CardDescription>
        </div>
        <Link href={MERCHANT_ROUTES.parcels} className="shrink-0">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
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
                <Button size="sm">{t("bookNew")}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border/50">
            {rows.map((row) => {
              const href = MERCHANT_ROUTES.parcel(row.id);
              return (
                <li key={row.id}>
                  <Link
                    href={href}
                    className="group block px-4 py-3.5 transition-colors hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50 sm:px-5"
                    aria-label={`${row.trackingCode} — ${row.recipientName}`}
                  >
                    {/* Mobile: stacked card */}
                    <div className="flex items-start justify-between gap-3 sm:hidden">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-body-sm font-semibold text-primary">
                          {row.trackingCode}
                        </p>
                        <p className="mt-0.5 truncate text-caption text-muted-foreground">
                          {row.recipientName}
                        </p>
                      </div>
                      <StatusBadge status={row.status} withIcon />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-caption text-muted-foreground sm:hidden">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{destination(row)}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {bdt(row.codAmount)}
                      </span>
                    </div>

                    {/* Desktop: table-style row */}
                    <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-3">
                      <div className="min-w-0 sm:col-span-3">
                        <p className="truncate font-mono text-body-sm font-semibold text-primary">
                          {row.trackingCode}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {dateTime(row.createdAt)}
                        </p>
                      </div>
                      <div className="min-w-0 sm:col-span-3">
                        <p className="truncate text-body-sm font-medium text-foreground">
                          {row.recipientName}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {destination(row)}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="sm:col-span-2 text-right">
                        <span className="tabular-nums text-body-sm font-semibold text-foreground">
                          {bdt(row.codAmount)}
                        </span>
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end gap-1 text-caption font-semibold text-primary">
                        {t("view")}
                        <ChevronRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
