"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { useGetParcelsQuery } from "../api/parcels.api";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { useFormatters } from "@/lib/format";
import { ReturnsKpiStrip } from "./returns/returns-kpi-strip";
import { ReturnsToolbar } from "./returns/returns-toolbar";
import { ReturnsItemCard } from "./returns/returns-item-card";

const RTO_STATUSES = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
];

export function ReturnsListView() {
  const t = useTranslations("Returns");
  const { bdt, date, time, number } = useFormatters();
  const routes = useRouteBase();

  const [activeTab, setActiveTab] = useState<"ALL" | ParcelStatus>("ALL");
  const [search, setSearch] = useState("");

  const queryParams = useMemo(() => {
    // Filter on the server: fetching the newest 100 parcels of any status and
    // filtering here only found returns among recent bookings (3 of 16).
    return {
      limit: 100,
      ...(activeTab === "ALL" ? { statuses: RTO_STATUSES } : { status: activeTab }),
      search: search.trim() || undefined,
    };
  }, [activeTab, search]);

  const { data, isLoading, isFetching, refetch } = useGetParcelsQuery(queryParams);
  // KPI cards always describe every return, whichever tab is open (deduped
  // with the list query when the All tab has no search).
  const { data: allReturnsData } = useGetParcelsQuery({ limit: 100, statuses: RTO_STATUSES });
  const allReturns = useMemo(() => allReturnsData?.data ?? [], [allReturnsData]);

  const allParcels = useMemo(() => data?.data ?? [], [data]);
  const returnParcels = useMemo(() => {
    if (activeTab === "ALL") {
      return allParcels.filter((p) => RTO_STATUSES.includes(p.status as ParcelStatus));
    }
    return allParcels;
  }, [allParcels, activeTab]);

  const stats = useMemo(() => {
    const initiated = allReturns.filter((p) => p.status === ParcelStatus.RTO_INITIATED).length;
    const inTransit = allReturns.filter((p) => p.status === ParcelStatus.RETURN_IN_TRANSIT).length;
    const completed = allReturns.filter((p) => p.status === ParcelStatus.RETURNED_TO_MERCHANT).length;
    const totalCod = allReturns
      .filter((p) => RTO_STATUSES.includes(p.status as ParcelStatus))
      .reduce((sum, p) => sum + (p.codAmount || 0), 0);

    return {
      active: initiated + inTransit,
      initiated,
      inTransit,
      completed,
      totalCod,
    };
  }, [allReturns]);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={routes.parcels}>
              <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-display-xs sm:text-display-sm font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
          </div>
          <p className="mt-1 text-caption sm:text-body-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5 rounded-xl hover:bg-surface-elevated font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>{t("refresh")}</span>
          </Button>
          <Link href={routes.parcels}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl hover:bg-surface-elevated font-medium">
              {t("allShipments")}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <ReturnsKpiStrip
        t={t}
        stats={stats}
        bdt={bdt}
        formatNumber={number}
      />

      {/* Filter and Lens Toolbar */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-5 sm:p-6 backdrop-blur-md space-y-5">
        <ReturnsToolbar
          t={t}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
        />

        <div>
          {isLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-surface-muted/60" />
              ))}
            </div>
          ) : returnParcels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                <PackageCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-body-sm font-bold text-foreground">
                {t("emptyTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-caption text-muted-foreground">
                {search ? t("emptySearch") : t("emptyDescription")}
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="mt-4 rounded-xl text-xs hover:bg-surface-elevated"
                >
                  {t("clearSearch")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {returnParcels.map((parcel) => (
                <ReturnsItemCard
                  key={parcel.id}
                  t={t}
                  parcel={parcel}
                  detailsHref={routes.parcel(parcel.id)}
                  bdt={bdt}
                  date={date}
                  time={time}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
