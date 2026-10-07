"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  type ColumnDef,
} from "@dhruto/ui";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  PackagePlus,
  Printer,
  Truck,
  UploadCloud,
} from "lucide-react";
import type { ParcelStatus } from "@dhruto/contracts";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useAppSelector } from "@/store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState, RetryButton } from "@/components/feedback/states";

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
  isLoading,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ElementType;
  tone: "primary" | "success" | "info" | "warning";
  isLoading: boolean;
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success-soft-foreground",
    info: "bg-info-soft text-info-soft-foreground",
    warning: "bg-warning-soft text-warning-soft-foreground",
  }[tone];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-h2 font-bold tabular-nums text-foreground">
        {isLoading ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-caption text-muted-foreground">{caption}</p>
    </Card>
  );
}

/** A quick action tile. `disabled` marks later-phase functionality. */
function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  badge,
  disabled,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}) {
  const content = (
    <Card className="flex h-full flex-col p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-body-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-caption text-muted-foreground">{description}</p>
      {badge ? (
        <Badge variant="secondary" className="mt-3 w-fit">
          {badge}
        </Badge>
      ) : null}
    </Card>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed opacity-60">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="group">
      {content}
    </Link>
  );
}

export function MerchantDashboard() {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError, refetch } = useGetMerchantDashboardQuery();

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
            ৳ {row.original.codAmount.toLocaleString()}
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
    [t],
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
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-h2 font-bold tracking-tight text-foreground">
            {user ? t("greeting", { name: user.name }) : t("dashboardTitle")}
          </h1>
          <p className="mt-1 text-body text-muted-foreground">{t("dashboardSubtitle")}</p>
        </div>
        <Link href={MERCHANT_ROUTES.createBooking}>
          <Button className="gap-2">
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            {t("bookNew")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label={t("totalBookings")}
          value={stats.totalOrders}
          caption={t("totalBookingsHint")}
          icon={Truck}
          tone="primary"
          isLoading={isLoading}
        />
        <MetricCard
          label={t("delivered")}
          value={stats.deliveredOrders}
          caption={t("deliveredHint")}
          icon={CheckCircle2}
          tone="success"
          isLoading={isLoading}
        />
        <MetricCard
          label={t("inTransit")}
          value={stats.inTransitOrders}
          caption={t("inTransitHint")}
          icon={Truck}
          tone="info"
          isLoading={isLoading}
        />
        <MetricCard
          label={t("pending")}
          value={stats.pendingOrders}
          caption={t("pendingHint")}
          icon={Clock}
          tone="warning"
          isLoading={isLoading}
        />
      </div>

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
                  ৳ {stats.collectedCodAmount.toLocaleString()}
                </dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-caption text-muted-foreground">{t("codPending")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  ৳ {pendingCod.toLocaleString()}
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
              {stats.returnedOrders.toLocaleString()}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>
    </div>
  );
}
