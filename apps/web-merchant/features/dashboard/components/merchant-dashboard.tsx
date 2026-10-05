"use client";

import React, { useState } from "react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@dhruto/ui";
import {
  PackagePlus,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  UploadCloud,
  Printer,
  FileText,
  Calendar,
  X,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useAppSelector } from "../../../store/hooks";
import { MERCHANT_ROUTES } from "@/config/routes";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ParcelStatus } from "@dhruto/contracts";

interface ShipmentRow {
  id: string;
  trackingCode: string;
  recipientName: string;
  district: string;
  status: ParcelStatus | string;
  codAmount: number;
}

const DEFAULT_SAMPLE_PARCELS: ShipmentRow[] = [
  {
    id: "p-1",
    trackingCode: "TRK123456789",
    recipientName: "Rahim Uddin",
    district: "Dhaka",
    status: ParcelStatus.OUT_FOR_DELIVERY,
    codAmount: 1250,
  },
  {
    id: "p-2",
    trackingCode: "TRK123456788",
    recipientName: "Ayesha Akter",
    district: "Chattogram",
    status: ParcelStatus.IN_TRANSIT,
    codAmount: 850,
  },
  {
    id: "p-3",
    trackingCode: "TRK123456787",
    recipientName: "Md. Hasan",
    district: "Sylhet",
    status: ParcelStatus.PICKED_UP,
    codAmount: 2300,
  },
  {
    id: "p-4",
    trackingCode: "TRK123456786",
    recipientName: "Fatema Begum",
    district: "Rajshahi",
    status: ParcelStatus.ORIGIN_HUB_RECEIVED,
    codAmount: 1450,
  },
  {
    id: "p-5",
    trackingCode: "TRK123456785",
    recipientName: "Kamal Hossain",
    district: "Khulna",
    status: ParcelStatus.DELIVERED,
    codAmount: 980,
  },
];

export function MerchantDashboard() {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetMerchantDashboardQuery();
  const [showPromo, setShowPromo] = useState(true);

  const stats = data?.data?.stats || {
    totalOrders: 124,
    pendingOrders: 8,
    inTransitOrders: 18,
    deliveredOrders: 98,
    returnedOrders: 0,
    totalCodAmount: 97980,
    collectedCodAmount: 85420,
  };

  const rawParcels = data?.data?.recentParcels || [];
  const displayParcels: ShipmentRow[] =
    rawParcels.length > 0 ? (rawParcels as ShipmentRow[]) : DEFAULT_SAMPLE_PARCELS;

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* 1. Header with greeting and date range filter */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {user ? `Welcome back, ${user.name}!` : t("dashboardTitle")}
          </h1>
          <p className="mt-1 text-body text-muted-foreground">
            {t("dashboardSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector Dropdown Pill */}
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-sm text-body-sm text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none">
                Today
              </span>
              <span className="font-medium text-xs leading-tight">
                {todayFormatted}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          </div>
        </div>
      </div>

      {/* 2. Top 4 Metric Cards (Matching design-1.png) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Bookings */}
        <Card className="p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold uppercase tracking-wider">
              {t("totalBookings")}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.totalOrders}
          </p>
          <div className="mt-2 flex items-center gap-1 text-caption text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>12% {t("fromYesterday")}</span>
          </div>
        </Card>

        {/* Card 2: Delivered */}
        <Card className="p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold uppercase tracking-wider">
              {t("delivered")}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.deliveredOrders}
          </p>
          <div className="mt-2 flex items-center gap-1 text-caption text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>15% {t("fromYesterday")}</span>
          </div>
        </Card>

        {/* Card 3: In Transit */}
        <Card className="p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold uppercase tracking-wider">
              {t("inTransit")}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.inTransitOrders}
          </p>
          <div className="mt-2 flex items-center gap-1 text-caption text-blue-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>8% {t("fromYesterday")}</span>
          </div>
        </Card>

        {/* Card 4: Pending */}
        <Card className="p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold uppercase tracking-wider">
              {t("pending")}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {isLoading ? "…" : stats.pendingOrders}
          </p>
          <div className="mt-2 flex items-center gap-1 text-caption text-muted-foreground font-medium">
            <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
            <span>2% {t("fromYesterday")}</span>
          </div>
        </Card>
      </div>

      {/* 3. Middle Section: Two Columns (Recent Shipments 2/3 + Settlement & Performance 1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left (2 Columns on large screens): Recent Shipments */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
              <CardTitle className="text-lg font-bold text-foreground">
                {t("recentOrders")}
              </CardTitle>
              <Link href={MERCHANT_ROUTES.parcels}>
                <Button variant="ghost" size="sm" className="text-body-sm text-primary hover:text-primary-hover">
                  {t("viewAll")}
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-8 text-center text-body-sm text-muted-foreground">
                  {t("loadingRecent")}
                </p>
              ) : displayParcels.length === 0 ? (
                <div className="space-y-3 p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                    <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-medium text-body-sm text-muted-foreground">
                    {t("emptyRecent")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-table">
                    <thead className="border-b border-border bg-surface-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3">{t("colTracking")}</th>
                        <th className="px-5 py-3">{t("colRecipient")}</th>
                        <th className="px-5 py-3">{t("colDestination")}</th>
                        <th className="px-5 py-3">{t("colStatus")}</th>
                        <th className="px-5 py-3">{t("colCod")}</th>
                        <th className="px-5 py-3 text-right">{t("colAction")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayParcels.map((parcel) => (
                        <tr
                          key={parcel.id}
                          className="transition-colors hover:bg-surface-muted/50"
                        >
                          <td className="px-5 py-3 font-mono font-medium text-xs">
                            <Link
                              href={MERCHANT_ROUTES.parcel(parcel.id)}
                              className="text-foreground hover:text-primary transition-colors"
                            >
                              {parcel.trackingCode}
                            </Link>
                          </td>
                          <td className="px-5 py-3 font-medium text-body-sm text-foreground">
                            {parcel.recipientName}
                          </td>
                          <td className="px-5 py-3 text-body-sm text-muted-foreground">
                            {parcel.district}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={parcel.status} />
                          </td>
                          <td className="px-5 py-3 font-medium tabular-nums text-foreground">
                            ৳ {parcel.codAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={MERCHANT_ROUTES.parcel(parcel.id)}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              {t("view")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right (1 Column): COD Settlement + Delivery Performance */}
        <div className="space-y-6">
          {/* COD Settlement Card */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-base font-bold text-foreground">
              {t("codSettlement")}
            </h3>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("availableBalance")}
                </span>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  ৳ {stats.collectedCodAmount.toLocaleString()}
                </p>
              </div>
              <Link href={MERCHANT_ROUTES.finance}>
                <Button size="sm" className="rounded-md px-4 font-semibold shadow-sm">
                  {t("withdraw")}
                </Button>
              </Link>
            </div>

            <div className="mt-4 border-t border-border pt-4 flex items-center justify-between text-body-sm">
              <div>
                <span className="text-caption text-muted-foreground block">
                  {t("pendingBalance")}
                </span>
                <span className="font-semibold text-foreground">
                  ৳ {(stats.totalCodAmount - stats.collectedCodAmount).toLocaleString()}
                </span>
              </div>
              <Link
                href={MERCHANT_ROUTES.finance}
                className="text-caption font-semibold text-primary hover:underline"
              >
                {t("viewDetails")}
              </Link>
            </div>
          </Card>

          {/* Delivery Performance Card with Circular Gauge */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-base font-bold text-foreground">
              {t("deliveryPerformance")}
            </h3>

            <div className="mt-4 flex items-center gap-5">
              {/* Circular Gauge Ring */}
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#E2E8F0"
                    strokeWidth="7"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#10A34A"
                    strokeWidth="7"
                    strokeDasharray={201}
                    strokeDashoffset={201 * (1 - 0.92)}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <span className="absolute text-base font-bold text-foreground">
                  92%
                </span>
              </div>

              <div>
                <p className="text-body font-semibold text-foreground">
                  {t("onTimeDelivery")}
                </p>
                <p className="text-caption text-muted-foreground">
                  {t("last30Days")}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Quick Actions Row (4 Cards matching design-1.png) */}
      <div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Action 1: Create Single Booking */}
          <Link href={MERCHANT_ROUTES.createBooking} className="group">
            <Card className="p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <PackagePlus className="h-5 w-5" />
              </span>
              <h4 className="mt-3 text-body font-semibold text-foreground">
                {t("createSingle")}
              </h4>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("createSingleDesc")}
              </p>
            </Card>
          </Link>

          {/* Action 2: Bulk Upload */}
          <Link href={MERCHANT_ROUTES.createBooking} className="group">
            <Card className="p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <UploadCloud className="h-5 w-5" />
              </span>
              <h4 className="mt-3 text-body font-semibold text-foreground">
                {t("bulkUpload")}
              </h4>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("bulkUploadDesc")}
              </p>
            </Card>
          </Link>

          {/* Action 3: Print Labels */}
          <Link href={MERCHANT_ROUTES.parcels} className="group">
            <Card className="p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Printer className="h-5 w-5" />
              </span>
              <h4 className="mt-3 text-body font-semibold text-foreground">
                {t("printLabels")}
              </h4>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("printLabelsDesc")}
              </p>
            </Card>
          </Link>

          {/* Action 4: View Reports */}
          <Link href={MERCHANT_ROUTES.finance} className="group">
            <Card className="p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <h4 className="mt-3 text-body font-semibold text-foreground">
                {t("viewReports")}
              </h4>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("viewReportsDesc")}
              </p>
            </Card>
          </Link>
        </div>
      </div>

      {/* 5. Bottom Callout Banner matching design-1.png */}
      {showPromo && (
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {t("bannerTitle")}
              </p>
              <p className="text-body-sm text-muted-foreground">
                Experience express delivery with 24h COD settlements across 64 districts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={MERCHANT_ROUTES.createBooking}>
              <Button size="sm" className="h-10 px-5 font-semibold shadow-sm">
                {t("startBooking")}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setShowPromo(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
