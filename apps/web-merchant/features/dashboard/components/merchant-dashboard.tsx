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
import { MerchantIllustrationBg } from "@/components/visual/illustration-backgrounds";

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

/** A quick action tile built on the shared interactive card with elevated aesthetics. */
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
    <div className="h-full rounded-2xl bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-muted/60">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      {badge ? (
        <span className="mt-3 inline-flex w-fit items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
      className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {content}
    </Link>
  );
}

/** COD collected vs pending, with a collection progress bar. */
function CodSummaryCard({ stats }: { stats: DashboardStats }) {
  const t = useTranslations("Index");
  const { bdt } = useFormatters();
  const pendingCod = pendingCodAmount(stats);
  const collectedRatio =
    stats.totalCodAmount > 0 ? (stats.collectedCodAmount / stats.totalCodAmount) * 100 : 0;

  return (
    <Card className="overflow-hidden rounded-3xl bg-card">
      <div className="border-b border-surface-muted/60 p-5 sm:p-6 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{t("codSettlement")}</span>
          </h2>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            T+1 Remittance
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("codSettlementHint")}</p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("codCollected")}
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
            {bdt(stats.collectedCodAmount)}
          </p>
          <div
            className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-muted/60"
            role="img"
            aria-label={`${t("codCollected")}: ${Math.round(collectedRatio)}%`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out shadow-2xs"
              style={{ width: `${Math.min(100, Math.max(0, collectedRatio))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
          <span className="text-muted-foreground font-medium">{t("codPending")}</span>
          <span className="font-bold tabular-nums text-foreground text-sm">{bdt(pendingCod)}</span>
        </div>

        <Link
          href={MERCHANT_ROUTES.finance}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <span>{t("codStatement")}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
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
      <MerchantIllustrationBg opacity={0.3} />
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
