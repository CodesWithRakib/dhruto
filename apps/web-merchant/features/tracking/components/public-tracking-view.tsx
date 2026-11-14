"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge, Button, Card, CardContent, DetailsSkeleton, Input } from "@dhruto/ui";
import {
  Building2,
  Check,
  Copy,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
  Radio,
  CheckCircle2,
  Share2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useGetPublicTrackingQuery } from "@/features/parcels/api/parcels.api";
import { usePathname, useRouter } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Timeline, TimelineItem } from "@/components/data-display/timeline";
import { ErrorState, NotFoundState, RetryButton } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";
import { ParcelStatus } from "@dhruto/contracts";

interface PublicTrackingViewProps {
  initialCode?: string;
  /**
   * Hide the built-in heading + search form. The public `/track` pages render
   * their own hero and search above this view; the dashboard surfaces keep the
   * default intro.
   */
  showIntro?: boolean;
  className?: string;
}

const REAL_SAMPLE_CODES = [
  { code: "DHR-20261114-NNN27T", status: "Hub Inbound", district: "Zindabazar, Sylhet" },
  { code: "DHR-2610-00101", status: "Delivered", district: "Dhanmondi, Dhaka" },
  { code: "DHR-2610-00107", status: "Out for Delivery", district: "Gulshan, Dhaka" },
  { code: "DHR-2610-00113", status: "In Transit", district: "Panchlaish, Chittagong" },
];

/**
 * Calculates human-readable 5-stage progress level (1-5) from ParcelStatus.
 */
function getProgressLevel(status: ParcelStatus | string): number {
  switch (status) {
    case ParcelStatus.CREATED:
    case ParcelStatus.PICKUP_REQUESTED:
      return 1;
    case ParcelStatus.PICKUP_ASSIGNED:
    case ParcelStatus.PICKED_UP:
    case ParcelStatus.ORIGIN_HUB_RECEIVED:
    case ParcelStatus.BAGGED:
      return 2;
    case ParcelStatus.IN_TRANSIT:
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
      return 3;
    case ParcelStatus.ASSIGNED_TO_RIDER:
    case ParcelStatus.OUT_FOR_DELIVERY:
    case ParcelStatus.DELIVERY_ATTEMPTED:
    case ParcelStatus.RESCHEDULED:
      return 4;
    case ParcelStatus.DELIVERED:
    case ParcelStatus.CASH_PENDING:
    case ParcelStatus.CASH_VERIFIED:
      return 5;
    case ParcelStatus.RTO_INITIATED:
    case ParcelStatus.RETURN_IN_TRANSIT:
    case ParcelStatus.RETURNED_TO_MERCHANT:
    case ParcelStatus.CANCELLED:
    case ParcelStatus.LOST:
    case ParcelStatus.DAMAGED:
      return 3; // Exception
    default:
      return 1;
  }
}

function getStatusTheme(status: ParcelStatus | string): "delivered" | "out_for_delivery" | "transit" | "return" | "default" {
  if (
    status === ParcelStatus.DELIVERED ||
    status === ParcelStatus.CASH_PENDING ||
    status === ParcelStatus.CASH_VERIFIED
  ) {
    return "delivered";
  }
  if (status === ParcelStatus.OUT_FOR_DELIVERY || status === ParcelStatus.ASSIGNED_TO_RIDER) {
    return "out_for_delivery";
  }
  if (
    status === ParcelStatus.IN_TRANSIT ||
    status === ParcelStatus.ORIGIN_HUB_RECEIVED ||
    status === ParcelStatus.DESTINATION_HUB_RECEIVED ||
    status === ParcelStatus.BAGGED
  ) {
    return "transit";
  }
  if (
    status === ParcelStatus.RTO_INITIATED ||
    status === ParcelStatus.RETURN_IN_TRANSIT ||
    status === ParcelStatus.RETURNED_TO_MERCHANT ||
    status === ParcelStatus.CANCELLED ||
    status === ParcelStatus.LOST ||
    status === ParcelStatus.DAMAGED
  ) {
    return "return";
  }
  return "default";
}

const MILESTONES = [
  { step: 1, titleEn: "Order Created", titleBn: "অর্ডার তৈরি", icon: Package },
  { step: 2, titleEn: "Hub Inbound", titleBn: "হাবে গৃহীত", icon: Building2 },
  { step: 3, titleEn: "Line-Haul", titleBn: "ট্রানজিট", icon: Truck },
  { step: 4, titleEn: "Out for Delivery", titleBn: "ডেলিভারিতে", icon: Radio },
  { step: 5, titleEn: "Delivered", titleBn: "ডেলিভার্ড", icon: CheckCircle2 },
];

/**
 * Public, unauthenticated shipment tracking cockpit.
 */
export function PublicTrackingView({ initialCode = "", showIntro = true, className }: PublicTrackingViewProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { dateTime } = useFormatters();

  const trackBase = pathname.includes("/customer/track")
    ? "/customer/track"
    : pathname.includes("/merchant/track")
      ? "/merchant/track"
      : pathname.includes("/admin/track")
        ? "/admin/track"
        : "/track";

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode.trim());
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setInputCode(initialCode);
    setActiveCode(initialCode.trim());
  }, [initialCode]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!shared) return;
    const timer = setTimeout(() => setShared(false), 2000);
    return () => clearTimeout(timer);
  }, [shared]);

  const { data, isFetching, isError, error, refetch } = useGetPublicTrackingQuery(activeCode, {
    skip: activeCode.length === 0,
  });

  const tracking = data?.data;
  const isNotFoundError =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 404;
  const showNotFound = Boolean(activeCode) && !isFetching && (isNotFoundError || (!tracking && !isError));
  const showError = Boolean(activeCode) && !isFetching && isError && !isNotFoundError && !tracking;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    setActiveCode(clean);
    router.replace(`${trackBase}/${encodeURIComponent(clean)}`);
  };

  const handleCopy = async () => {
    if (!tracking) return;
    try {
      await navigator.clipboard.writeText(tracking.trackingCode);
      setCopied(true);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || !tracking) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Track Parcel ${tracking.trackingCode} — Dhruto Express`,
          text: `Live delivery telemetry for parcel ${tracking.trackingCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
    } catch {
      // No-op
    }
  };

  const currentLevel = tracking ? getProgressLevel(tracking.status) : 1;
  const statusTheme = tracking ? getStatusTheme(tracking.status) : "default";

  return (
    <div className={className ?? "dhruto-container max-w-4xl py-6 sm:py-10"}>
      {/* Search Header for Internal Dashboard Views or Standalone */}
      {showIntro ? (
        <div className="track-cockpit-card p-6 sm:p-9 mb-10 max-w-3xl mx-auto">
          <div className="text-center space-y-2 mb-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
              <Package className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="text-balance text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {t("searchTitle")}
            </h1>
            <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
              {t("searchSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSearch} role="search" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="text"
                name="trackingCode"
                value={inputCode}
                onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                placeholder={t("inputPlaceholder")}
                aria-label={t("searchTitle")}
                className="h-12 pl-11 font-mono uppercase tracking-wider rounded-xl"
                required
              />
            </div>
            <Button type="submit" disabled={isFetching} className="h-12 gap-2 px-7 rounded-xl font-semibold shadow-md">
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("trackBtn")}
            </Button>
          </form>

          {/* Quick sample chips */}
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Real sample codes:
            </span>
            <div className="flex flex-wrap gap-2">
              {REAL_SAMPLE_CODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setInputCode(item.code);
                    setActiveCode(item.code);
                    router.replace(`${trackBase}/${encodeURIComponent(item.code)}`);
                  }}
                  className="track-sample-chip"
                >
                  {item.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Loading Skeleton */}
      <div aria-live="polite">
        {isFetching && !tracking ? (
          <div className="space-y-4">
            <DetailsSkeleton />
          </div>
        ) : showError ? (
          <Card className="border-danger/30 p-4">
            <ErrorState
              title={t("loadError")}
              description={t("loadErrorDesc")}
              action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
            />
          </Card>
        ) : null}
      </div>

      {/* 404 Not Found State with High-Tech Cockpit */}
      {showNotFound ? (
        <div className="track-not-found-cockpit max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2 text-warning font-mono text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="h-4 w-4" />
            <span>Radar Signal Not Acquired</span>
          </div>

          <NotFoundState title={t("notFound")} description={t("notFoundDesc")} />

          <div className="pt-4 max-w-md mx-auto border-t border-border/60">
            <p className="text-xs text-muted-foreground mb-3 font-medium">
              Click any active seeded shipment below to inspect real live telemetry:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {REAL_SAMPLE_CODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setInputCode(item.code);
                    setActiveCode(item.code);
                    router.replace(`${trackBase}/${encodeURIComponent(item.code)}`);
                  }}
                  className="track-sample-chip"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item.code}</span>
                  <span className="text-[10px] text-muted-foreground">({item.status})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Live Tracking Telemetry Payload */}
      {!isFetching && tracking ? (
        <div className="space-y-8">
          {/* Dynamic Status Masthead */}
          <div className="track-status-masthead" data-status-type={statusTheme}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="track-status-beacon text-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    {t("trackingId")}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">
                    • WAYBILL PROTOCOL
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <h2 className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {tracking.trackingCode}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleCopy()}
                    aria-label={t("copyCode")}
                    title={t("copyCode")}
                    className="h-8 w-8 rounded-lg hover:bg-surface"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                  <span className="sr-only" role="status">
                    {copied ? t("copied") : ""}
                  </span>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleShare()}
                  className="h-9 gap-1.5 rounded-lg text-xs font-medium"
                >
                  {shared ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {shared ? t("copied") : "Share Link"}
                </Button>

                <StatusBadge status={tracking.status} withIcon className="px-3.5 py-1 text-xs font-semibold shadow-sm" />
              </div>
            </div>

            {/* Kinetic 5-Stage Milestone Progress Bar */}
            <div className="pt-2 sm:pt-3">
              <div className="flex items-center justify-between mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2 text-foreground font-semibold">
                  <Radio className="h-4 w-4 text-primary animate-pulse" />
                  Shipment Journey Milestone
                </span>
                <span className="font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Stage {currentLevel} of 5
                </span>
              </div>

              <div className="relative py-2">
                {/* Milestone Track Container - perfectly spans between column 1 center (10%) and column 5 center (90%) */}
                <div
                  aria-hidden="true"
                  className="absolute top-7 -translate-y-1/2 left-[10%] right-[10%] h-1 pointer-events-none"
                >
                  {/* Background Track Line */}
                  <div className="h-full w-full bg-border/70 rounded-full" />
                  {/* Active Filled Line */}
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-primary to-primary rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((currentLevel - 1) / 4) * 100))}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-5 relative z-10">
                  {MILESTONES.map((m) => {
                    const Icon = m.icon;
                    const isPassed = currentLevel > m.step;
                    const isCurrent = currentLevel === m.step;
                    const label = locale === "bn" ? m.titleBn : m.titleEn;

                    return (
                      <div key={m.step} className="flex flex-col items-center text-center px-1">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                            isPassed
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                              : isCurrent
                                ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30 scale-110 ring-4 ring-primary/25"
                                : "bg-surface border-border text-muted-foreground/60"
                          }`}
                        >
                          {isPassed ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : (
                            <Icon className={`h-4 w-4 ${isCurrent ? "animate-pulse stroke-[2.2]" : "stroke-[1.7]"}`} />
                          )}
                        </div>
                        <span
                          className={`mt-2.5 text-[11px] sm:text-xs tracking-tight transition-colors ${
                            isCurrent
                              ? "text-primary font-bold"
                              : isPassed
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground/80 font-medium"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Details Bento Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Destination */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-2xs hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{t("destination")}</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {tracking.recipientThana}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tracking.recipientDistrict} District
              </p>
            </div>

            {/* Current Location Hub */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-2xs hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{t("location")}</span>
              </div>
              <p className="text-base font-bold text-foreground truncate">
                {tracking.currentHubName ?? t("locationPending")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tracking.currentHubName ? "Active Gateway Scan" : "Awaiting Inbound"}
              </p>
            </div>

            {/* Masked Contact */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-2xs hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{t("contact")}</span>
              </div>
              <p className="font-mono text-base font-bold text-foreground">
                {tracking.recipientPhoneMasked}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-success font-medium mt-0.5">
                <ShieldCheck className="h-3 w-3" />
                <span>Masked for privacy</span>
              </div>
            </div>

            {/* Last Updated */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-2xs hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Telemetry Sync</span>
              </div>
              <p className="text-xs font-semibold text-foreground leading-snug">
                {dateTime(tracking.updatedAt)}
              </p>
              <Badge variant="secondary" className="mt-2 text-[10px] font-mono">
                {tracking.status}
              </Badge>
            </div>
          </div>

          {/* Timeline Section */}
          <Card className="rounded-2xl border border-border/60 shadow-soft overflow-hidden bg-card">
            <div className="border-b border-border/60 px-6 py-4.5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {t("timeline")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete immutable scan sequence for this parcel
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold text-primary">
                {tracking.timeline.length} Scans Logged
              </span>
            </div>

            <CardContent className="p-6">
              <Timeline label={t("timeline")}>
                {tracking.timeline.map((event, index) => {
                  const label = locale === "bn" ? event.labelBn : event.labelEn;
                  const isLatest = index === tracking.timeline.length - 1;

                  return (
                    <TimelineItem
                      key={`${event.timestamp}-${index}`}
                      title={
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{label}</span>
                          {isLatest ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              LATEST SCAN
                            </span>
                          ) : null}
                        </div>
                      }
                      timestamp={dateTime(event.timestamp)}
                      dateTime={event.timestamp}
                      tone={
                        isLatest
                          ? "primary"
                          : event.status === ParcelStatus.DELIVERY_ATTEMPTED ||
                              event.status === ParcelStatus.RESCHEDULED
                            ? "warning"
                            : event.status === ParcelStatus.CANCELLED ||
                                event.status === ParcelStatus.LOST ||
                                event.status === ParcelStatus.DAMAGED
                              ? "danger"
                              : "success"
                      }
                      current={isLatest}
                    >
                      {event.note ? (
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {event.note}
                        </p>
                      ) : null}
                    </TimelineItem>
                  );
                })}
              </Timeline>
            </CardContent>

            <div className="border-t border-border/60 bg-surface-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {t("lastUpdated", {
                  date: dateTime(tracking.updatedAt),
                })}
              </span>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Verified by Dhruto Logistics Engine</span>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
