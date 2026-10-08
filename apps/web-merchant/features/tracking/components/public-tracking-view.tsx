"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge, Button, Card, CardContent, CardHeader, DetailsSkeleton, Input } from "@dhruto/ui";
import { Building2, Check, Copy, MapPin, Package, Phone, Search } from "lucide-react";
import { useGetPublicTrackingQuery } from "@/features/parcels/api/parcels.api";
import { usePathname, useRouter } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Timeline, TimelineItem } from "@/components/data-display/timeline";
import { ErrorState, NotFoundState, RetryButton } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";

interface PublicTrackingViewProps {
  initialCode?: string;
}

/**
 * Public, unauthenticated shipment tracking.
 *
 * The view renders exactly what `GET /tracking/:code` returns — there is no
 * fallback/demo data, and the API deliberately omits merchant identity,
 * financials and internal ids.
 */
export function PublicTrackingView({ initialCode = "" }: PublicTrackingViewProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { dateTime } = useFormatters();

  // Stay inside the console the user is in: merchant and admin reuse this
  // view, so searches must not leak to the public /track namespace.
  const trackBase = pathname.includes("/merchant/track")
    ? "/merchant/track"
    : pathname.includes("/admin/track")
      ? "/admin/track"
      : "/track";

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode.trim());
  const [copied, setCopied] = useState(false);

  // Keep the query in sync when the user lands on /track/:code directly.
  useEffect(() => {
    setInputCode(initialCode);
    setActiveCode(initialCode.trim());
  }, [initialCode]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const { data, isFetching, isError, error, refetch } = useGetPublicTrackingQuery(activeCode, {
    skip: activeCode.length === 0,
  });

  const tracking = data?.data;
  // A 404 means "no such shipment"; any other failure is a network/server
  // error and gets a retry action instead of a not-found message.
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
    // Replace so repeated searches don't spam the history stack; the URL
    // still reflects the active code for sharing and back-navigation.
    router.replace(`${trackBase}/${encodeURIComponent(clean)}`);
  };

  const handleCopy = async () => {
    if (!tracking) return;
    try {
      await navigator.clipboard.writeText(tracking.trackingCode);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions, insecure context) — no-op.
    }
  };

  return (
    <div className="dhruto-container max-w-3xl py-10 sm:py-14">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Package className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-balance text-h2 font-bold text-foreground">{t("searchTitle")}</h1>
        <p className="mx-auto max-w-md text-pretty text-body text-muted-foreground">
          {t("searchSubtitle")}
        </p>

        <form
          onSubmit={handleSearch}
          role="search"
          className="mx-auto flex w-full max-w-lg flex-col gap-2 pt-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder={t("inputPlaceholder")}
              aria-label={t("searchTitle")}
              className="h-11 pl-10 font-mono uppercase"
              required
            />
          </div>
          <Button type="submit" disabled={isFetching} className="h-11 gap-1.5 px-6">
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("trackBtn")}
          </Button>
        </form>
      </div>

      <div aria-live="polite" className="py-6">
        {isFetching && !tracking ? (
          <DetailsSkeleton />
        ) : showError ? (
          <Card>
            <ErrorState
              title={t("loadError")}
              description={t("loadErrorDesc")}
              action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
            />
          </Card>
        ) : null}
      </div>

      {showNotFound ? (
        <Card>
          <NotFoundState title={t("notFound")} description={t("notFoundDesc")} />
        </Card>
      ) : null}

      {!isFetching && tracking ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border/70 px-6 py-4">
              <div className="min-w-0">
                <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("trackingId")}
                </p>
                <p className="truncate font-mono text-h3 font-bold text-foreground">
                  {tracking.trackingCode}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleCopy()}
                  aria-label={t("copyCode")}
                  title={t("copyCode")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
                <span className="sr-only" role="status">
                  {copied ? t("copied") : ""}
                </span>
                <StatusBadge status={tracking.status} withIcon className="px-3 py-1" />
              </div>
            </CardHeader>

            <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-caption font-semibold uppercase text-muted-foreground">
                  {t("destination")}
                </p>
                <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {tracking.recipientThana}, {tracking.recipientDistrict}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-caption font-semibold uppercase text-muted-foreground">
                  {t("contact")}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-body text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {tracking.recipientPhoneMasked}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-caption font-semibold uppercase text-muted-foreground">
                  {t("location")}
                </p>
                <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {tracking.currentHubName ?? t("locationPending")}
                </p>
              </div>
            </CardContent>

            <div className="border-t border-border px-6 py-6">
              <h2 className="mb-6 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                {t("timeline")}
              </h2>

              <Timeline label={t("timeline")}>
                {tracking.timeline.map((event, index) => {
                  const label = locale === "bn" ? event.labelBn : event.labelEn;
                  const isLatest = index === tracking.timeline.length - 1;
                  return (
                    <TimelineItem
                      key={`${event.timestamp}-${index}`}
                      title={label}
                      timestamp={dateTime(event.timestamp)}
                      dateTime={event.timestamp}
                      tone={isLatest ? "primary" : "neutral"}
                      current={isLatest}
                    >
                      {event.note ? (
                        <p className="mt-1 text-body-sm text-muted-foreground">{event.note}</p>
                      ) : null}
                    </TimelineItem>
                  );
                })}
              </Timeline>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-4 text-caption text-muted-foreground">
              <span>
                {t("lastUpdated", {
                  date: dateTime(tracking.updatedAt),
                })}
              </span>
              <Badge variant="secondary">
                {t("statusLabel", {
                  status: tracking.status,
                })}
              </Badge>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
