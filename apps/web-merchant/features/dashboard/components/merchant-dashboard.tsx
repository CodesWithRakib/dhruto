"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@dhruto/ui";
import {
  ArrowRight,
  FileText,
  Package,
  PackagePlus,
  Plus,
  Printer,
  Search,
  UploadCloud,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { MERCHANT_ROUTES } from "@/config/routes";
import { ErrorState, EmptyState, RetryButton } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useGetMerchantAnalyticsQuery } from "@/features/analytics/api/analytics.api";
import type { DashboardStats } from "../../merchants/api/merchants.api";
import { buildAttentionItems, hasOverviewData, pendingCodAmount } from "../lib/overview";
import { DashboardHeader } from "./dashboard-header";
import { ShipmentKpis, DeliveryHealth } from "./shipment-overview";
import { NeedsAttention } from "./needs-attention";
import { RecentShipments, type ShipmentRow } from "./recent-shipments";
import { ShipmentPerformance } from "./shipment-performance";
import { DashboardCanvasBg } from "./dashboard-canvas-bg";

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  inTransitOrders: 0,
  deliveredOrders: 0,
  returnedOrders: 0,
  totalCodAmount: 0,
  collectedCodAmount: 0,
  totalDeliveryFees: 0,
};

/** A kinetic quick action tile inspired by the Home bento grid. */
function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  badge,
  disabled,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}) {
  const content = (
    <div className="group relative h-full overflow-hidden rounded-3xl bg-card/90 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
      {/* Top Specular Line */}

      <div className="flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed font-normal">{description}</p>

      {badge ? (
        <span className="mt-3.5 inline-flex w-fit items-center rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
          {badge}
        </span>
      ) : null}
    </div>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed opacity-60">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {content}
    </Link>
  );
}

/** Executive Fintech COD & Settlement Card with gradient mesh & neon glow. */
function CodSummaryCard({ stats }: { stats: DashboardStats }) {
  const t = useTranslations("Index");
  const { bdt } = useFormatters();
  const pendingCod = pendingCodAmount(stats);
  const collectedRatio =
    stats.totalCodAmount > 0 ? (stats.collectedCodAmount / stats.totalCodAmount) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-inverse via-inverse to-inverse-soft p-6 text-white">
      {/* Decorative Atmospheric Bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-success/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-info/15 blur-3xl"
      />

      {/* Card Header */}
      <div className="relative z-10 flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-success/20 text-success">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("codSettlement")}
            </h2>
            <p className="text-[11px] text-white/60">{t("codSettlementHint")}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-0.5 text-[10px] font-bold text-success backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          T+1 Remittance
        </span>
      </div>

      {/* Metrics Section */}
      <div className="relative z-10 mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-success/80">
              {t("codCollected")}
            </p>
            <span className="text-[11px] font-semibold text-white/80">
              {Math.round(collectedRatio)}% Collected
            </span>
          </div>
          <p className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white">
            {bdt(stats.collectedCodAmount)}
          </p>
          
          {/* Neon Gradient Progress Bar */}
          <div
            className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-black/40 p-0.5"
            role="img"
            aria-label={`${t("codCollected")}: ${Math.round(collectedRatio)}%`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-success via-success-soft to-info transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, collectedRatio))}%` }}
            />
          </div>
        </div>

        {/* Pending COD Glass Container */}
        <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3.5 backdrop-blur-md text-xs">
          <span className="text-white/70 font-medium">{t("codPending")}</span>
          <span className="font-bold tabular-nums text-success text-sm sm:text-base">
            {bdt(pendingCod)}
          </span>
        </div>

        {/* Action Link */}
        <Link
          href={MERCHANT_ROUTES.finance}
          className="group inline-flex items-center gap-2 text-xs font-bold text-success hover:text-success-soft transition-colors"
        >
          <span>{t("codStatement")}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function MerchantDashboard({ today }: { today: string }) {
  const t = useTranslations("Index");
  const { data, isLoading, isError, refetch } = useGetMerchantDashboardQuery();
  const analyticsQuery = useGetMerchantAnalyticsQuery({ period: "30d" });

  const stats = data?.data?.stats ?? EMPTY_STATS;
  const merchant = data?.data?.merchant;

  const recentRows: ShipmentRow[] = useMemo(
    () =>
      (data?.data?.recentParcels ?? []).map((parcel) => ({
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        recipientName: parcel.recipientName,
        district: parcel.district,
        thana: parcel.thana,
        status: parcel.status,
        codAmount: parcel.codAmount,
        createdAt: parcel.createdAt,
      })),
    [data],
  );

  const attention = useMemo(() => buildAttentionItems(stats), [stats]);
  const showEmpty = !isLoading && !isError && !hasOverviewData(stats);

  return (
    <div className="relative space-y-6">
      <DashboardCanvasBg />
      <DashboardHeader today={today} businessName={merchant?.businessName} />

      {isError ? (
        <Card className="overflow-hidden">
          <ErrorState
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
          />
        </Card>
      ) : showEmpty ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Package}
            title={t("emptyOverviewTitle")}
            description={t("emptyOverviewDescription")}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href={MERCHANT_ROUTES.createBooking}>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t("createSingle")}
                  </Button>
                </Link>
                <Link href={MERCHANT_ROUTES.tracking}>
                  <Button variant="outline" className="gap-2">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    {t("trackParcel")}
                  </Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <ShipmentKpis stats={stats} isLoading={isLoading} />

          <DeliveryHealth
            stats={stats}
            analytics={analyticsQuery.data?.data}
            isLoading={isLoading || analyticsQuery.isLoading}
            isAnalyticsAvailable={analyticsQuery.isSuccess && Boolean(analyticsQuery.data?.data)}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <RecentShipments
                rows={recentRows}
                isLoading={isLoading}
                isError={false}
                onRetry={() => void refetch()}
              />
            </div>
            <div className="space-y-6">
              <CodSummaryCard stats={stats} />
            </div>
          </div>

          <NeedsAttention items={attention} isLoading={isLoading} />

          <ShipmentPerformance
            analytics={analyticsQuery.data?.data}
            isLoading={analyticsQuery.isLoading}
            isError={analyticsQuery.isError}
            onRetry={() => void analyticsQuery.refetch()}
          />
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-h4 font-bold text-foreground">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href={MERCHANT_ROUTES.createBooking}
            icon={PackagePlus}
            title={t("createSingle")}
            description={t("createSingleDesc")}
          />
          <QuickAction
            href={`${MERCHANT_ROUTES.parcels}?action=bulk`}
            icon={UploadCloud}
            title={t("bulkUpload")}
            description={t("bulkUploadDesc")}
            badge="CSV / Excel"
          />
          <QuickAction
            href={MERCHANT_ROUTES.parcels}
            icon={Printer}
            title={t("printLabels")}
            description={t("printLabelsDesc")}
          />
          <QuickAction
            href={MERCHANT_ROUTES.analytics}
            icon={FileText}
            title={t("viewReports")}
            description={t("viewReportsDesc")}
          />
        </div>
      </section>
    </div>
  );
}
