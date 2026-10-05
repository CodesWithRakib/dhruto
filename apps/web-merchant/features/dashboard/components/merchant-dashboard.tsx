"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from "@dhruto/ui";
import {
  PackagePlus,
  PackageSearch,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useAppSelector } from "../../../store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { KpiCard } from "@/components/data-display/kpi-card";
import { StatusBadge } from "@/components/data-display/status-badge";

export function MerchantDashboard() {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetMerchantDashboardQuery();

  const stats = data?.data?.stats || {
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    totalCodAmount: 0,
    collectedCodAmount: 0,
  };

  const recentParcels = data?.data?.recentParcels || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-h1 text-foreground">
            {user ? `${user.name} — ${t("dashboardTitle")}` : t("dashboardTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("dashboardSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={MERCHANT_ROUTES.parcels}>
            <Button variant="outline" className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              {t("trackParcel")}
            </Button>
          </Link>
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              {t("bookNew")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards — horizontally scrollable on the smallest screens. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <KpiCard
          label={t("kpiTotal")}
          value={isLoading ? "…" : stats.totalOrders}
          icon={Truck}
          tone="primary"
        />
        <KpiCard
          label={t("kpiPending")}
          value={isLoading ? "…" : stats.pendingOrders}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label={t("kpiInTransit")}
          value={isLoading ? "…" : stats.inTransitOrders}
          icon={TrendingUp}
          tone="info"
        />
        <KpiCard
          label={t("kpiDelivered")}
          value={isLoading ? "…" : stats.deliveredOrders}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label={t("kpiCod")}
          value={isLoading ? "…" : `৳${stats.collectedCodAmount.toLocaleString()}`}
          icon={Receipt}
          tone="neutral"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Recent shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="text-h3 text-foreground">{t("recentOrders")}</CardTitle>
            <CardDescription>{t("recentOrdersSubtitle")}</CardDescription>
          </div>
          <Link href={MERCHANT_ROUTES.parcels}>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-caption">
              {t("viewAll")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-body-sm text-muted-foreground">
              {t("loadingRecent")}
            </p>
          ) : recentParcels.length === 0 ? (
            <div className="space-y-3 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="font-medium text-body-sm text-muted-foreground">
                {t("emptyRecent")}
              </p>
              <Link href={MERCHANT_ROUTES.createBooking}>
                <Button size="sm" className="mt-1">
                  <PackagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("bookNew")}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-table">
                  <thead className="border-b border-border bg-surface-muted text-caption uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t("colTracking")}</th>
                      <th className="px-4 py-3 font-semibold">{t("colRecipient")}</th>
                      <th className="px-4 py-3 font-semibold">{t("colDestination")}</th>
                      <th className="px-4 py-3 font-semibold">{t("colCod")}</th>
                      <th className="px-4 py-3 font-semibold">{t("colStatus")}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t("colAction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentParcels.map((parcel) => (
                      <tr key={parcel.id} className="transition-colors hover:bg-surface-muted">
                        <td className="px-4 py-3 font-mono font-medium">
                          <Link
                            href={MERCHANT_ROUTES.parcel(parcel.id)}
                            className="text-primary hover:underline"
                          >
                            {parcel.trackingCode}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{parcel.recipientName}</p>
                          <p className="font-mono text-caption text-muted-foreground">
                            {parcel.recipientPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{parcel.district}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                          ৳{parcel.codAmount}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={parcel.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={MERCHANT_ROUTES.parcelLabel(parcel.id)}>
                              <Button variant="ghost" size="sm" className="h-8 text-caption">
                                {t("label")}
                              </Button>
                            </Link>
                            <Link href={MERCHANT_ROUTES.parcel(parcel.id)}>
                              <Button variant="outline" size="sm" className="h-8 text-caption">
                                {t("view")}
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {recentParcels.map((parcel) => (
                  <li key={parcel.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={MERCHANT_ROUTES.parcel(parcel.id)}
                        className="font-mono text-body font-medium text-primary hover:underline"
                      >
                        {parcel.trackingCode}
                      </Link>
                      <StatusBadge status={parcel.status} />
                    </div>
                    <p className="text-body-sm text-foreground">{parcel.recipientName}</p>
                    <div className="flex items-center justify-between text-caption text-muted-foreground">
                      <span>{parcel.district}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        ৳{parcel.codAmount}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
