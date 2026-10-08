"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  KpiGridSkeleton,
  type ColumnDef,
} from "@dhruto/ui";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  PackagePlus,
  Printer,
  Truck,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import type { ParcelStatus } from "@dhruto/contracts";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useAppSelector } from "@/store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { StatusBadge } from "@/components/data-display/status-badge";
import { KpiCard } from "@/components/data-display/kpi-card";
import { InteractiveCard } from "@/components/data-display/cards";
import { PageHeader } from "@/components/page-header";
import { Stagger } from "@/components/motion/fade-in";
import { ErrorState, RetryButton } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";

interface ShipmentRow {
  id: string;
  trackingCode: string;
  recipientName: string;
  district: string;
  status: ParcelStatus | string;
  codAmount: number;
}

/** One honest summary card: value, label and a factual caption (no invented deltas). */
function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "info" | "warning";
}) {
  return (
    <KpiCard
      label={label}
      value={value}
      hint={caption}
      icon={Icon}
      tone={tone}
    />
  );
}

/** A quick action tile built on the shared interactive card. */
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
    <InteractiveCard className="h-full p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-body-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-caption text-muted-foreground">{description}</p>
      {badge ? (
        <span className="mt-3 inline-flex w-fit items-center rounded-md bg-surface-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </InteractiveCard>
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
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {content}
    </Link>
  );
}

export function MerchantDashboard() {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError, refetch } = useGetMerchantDashboardQuery();
  const { bdt, number } = useFormatters();

  const stats = data?.data?.stats ?? {
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    totalCodAmount: 0,
    collectedCodAmount: 0,
  };

  const recentParcels: ShipmentRow[] = useMemo(
    () =>
      (data?.data?.recentParcels ?? []).map((parcel) => ({
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        recipientName: parcel.recipientName,
        district: parcel.district,
        status: parcel.status,
        codAmount: parcel.codAmount,
      })),
    [data],
  );

  const pendingCod = Math.max(0, stats.totalCodAmount - stats.collectedCodAmount);

  const columns: ColumnDef<ShipmentRow>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: t("colTracking"),
        cell: ({ row }) => (
          <Link
            href={MERCHANT_ROUTES.parcel(row.original.id)}
            className="font-mono text-caption font-medium text-primary hover:underline"
          >
            {row.original.trackingCode}
          </Link>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("colRecipient"),
        cell: ({ row }) => (
          <span className="text-body-sm font-medium text-foreground">
            {row.original.recipientName}
          </span>
        ),
      },
      {
        accessorKey: "district",
        header: t("colDestination"),
        cell: ({ row }) => (
          <span className="text-body-sm text-muted-foreground">{row.original.district || "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("colStatus"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "codAmount",
        header: t("colCod"),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">
            {bdt(row.original.codAmount)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("colAction")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              href={MERCHANT_ROUTES.parcel(row.original.id)}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {t("view")}
            </Link>
          </div>
        ),
      },
    ],
    [t, bdt],
  );

  if (isError) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <ErrorState
          title={t("loadErrorTitle")}
          description={t("loadErrorDescription")}
          action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user ? t("greeting", { name: user.name }) : t("dashboardTitle")}
        description={t("dashboardSubtitle")}
        actions={
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button className="gap-2">
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              {t("bookNew")}
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <KpiGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            label={t("totalBookings")}
            value={number(stats.totalOrders)}
            caption={t("totalBookingsHint")}
            icon={Package}
            tone="primary"
          />
          <MetricCard
            label={t("delivered")}
            value={number(stats.deliveredOrders)}
            caption={t("deliveredHint")}
            icon={CheckCircle2}
            tone="success"
          />
          <MetricCard
            label={t("inTransit")}
            value={number(stats.inTransitOrders)}
            caption={t("inTransitHint")}
            icon={Truck}
            tone="info"
          />
          <MetricCard
            label={t("pending")}
            value={number(stats.pendingOrders)}
            caption={t("pendingHint")}
            icon={Clock}
            tone="warning"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0: a grid item defaults to min-width:auto, so the wide shipment
            table would otherwise stretch the track past the viewport instead of
            scrolling inside the table's own overflow container. */}
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
              <div>
                <CardTitle className="text-h4">{t("recentOrders")}</CardTitle>
                <CardDescription className="mt-1">{t("recentOrdersSubtitle")}</CardDescription>
              </div>
              <Link href={MERCHANT_ROUTES.parcels}>
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  {t("viewAll")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={recentParcels}
                isLoading={isLoading}
                emptyMessage={t("emptyRecent")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-h4 font-bold text-foreground">{t("codSettlement")}</h2>
            <p className="mt-1 text-caption text-muted-foreground">{t("codSettlementHint")}</p>

            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("codCollected")}
                </dt>
                <dd className="mt-0.5 text-h3 font-bold tabular-nums text-foreground">
                  {bdt(stats.collectedCodAmount)}
                </dd>
              </div>
              <div className="border-t border-border/70 pt-3">
                <dt className="text-caption text-muted-foreground">{t("codPending")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {bdt(pendingCod)}
                </dd>
              </div>
            </dl>

            <Link
              href={MERCHANT_ROUTES.finance}
              className="mt-4 inline-block text-caption font-semibold text-primary hover:underline"
            >
              {t("codStatement")}
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="text-h4 font-bold text-foreground">{t("returnsTitle")}</h2>
            <p className="mt-1 text-caption text-muted-foreground">{t("returnsHint")}</p>
            <p className="mt-3 text-h3 font-bold tabular-nums text-foreground">
              {number(stats.returnedOrders)}
            </p>
            <Link
              href={MERCHANT_ROUTES.parcels}
              className="mt-4 inline-block text-caption font-semibold text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </Card>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-h4 font-bold text-foreground">{t("quickActions")}</h2>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href={MERCHANT_ROUTES.createBooking}
            icon={PackagePlus}
            title={t("createSingle")}
            description={t("createSingleDesc")}
          />
          <QuickAction
            href={MERCHANT_ROUTES.createBooking}
            icon={UploadCloud}
            title={t("bulkUpload")}
            description={t("bulkUploadDesc")}
            badge={t("futureFeature")}
            disabled
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
        </Stagger>
      </section>
    </div>
  );
}
