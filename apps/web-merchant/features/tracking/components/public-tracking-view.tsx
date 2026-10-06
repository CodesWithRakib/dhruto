"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
} from "@dhruto/ui";
import {
  AlertCircle,
  Building2,
  Check,
  MapPin,
  Package,
  Phone,
  Search,
} from "lucide-react";
import { useGetPublicTrackingQuery } from "@/features/parcels/api/parcels.api";
import { useRouter } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";

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

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode.trim());

  // Keep the query in sync when the user lands on /track/:code directly.
  useEffect(() => {
    setInputCode(initialCode);
    setActiveCode(initialCode.trim());
  }, [initialCode]);

  const { data, isFetching, isError } = useGetPublicTrackingQuery(activeCode, {
    skip: activeCode.length === 0,
  });

  const tracking = data?.data;
  const isNotFound = Boolean(activeCode) && !isFetching && (isError || !tracking);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    setActiveCode(clean);
    router.push(`/track/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="dhruto-container max-w-3xl py-10 sm:py-14">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Package className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-balance text-h2 font-bold text-foreground">
          {t("searchTitle")}
        </h1>
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

      <p
        role="status"
        aria-live="polite"
        className="py-6 text-center text-body text-muted-foreground"
      >
        {isFetching ? t("loading") : ""}
      </p>

      {isNotFound ? (
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-9 w-9 text-danger" aria-hidden="true" />
          <h2 className="text-h3 text-foreground">{t("notFound")}</h2>
          <p className="mt-1 text-body text-muted-foreground">{t("notFoundDesc")}</p>
        </Card>
      ) : null}

      {!isFetching && tracking ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("trackingId")}
                </p>
                <p className="truncate font-mono text-h3 font-bold text-foreground">
                  {tracking.trackingCode}
                </p>
              </div>
              <StatusBadge status={tracking.status} withIcon className="shrink-0 px-3 py-1" />
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

              <ol className="relative ml-2 space-y-8 border-l-2 border-border pb-2 pl-6">
                {tracking.timeline.map((event, index) => {
                  const label = locale === "bn" ? event.labelBn : event.labelEn;
                  const isLatest = index === tracking.timeline.length - 1;
                  return (
                    <li key={`${event.timestamp}-${index}`} className="relative">
                      <span
                        aria-hidden="true"
                        className={
                          isLatest
                            ? "absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            : "absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"
                        }
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-body font-bold text-foreground">{label}</span>
                        <time
                          dateTime={event.timestamp}
                          className="font-mono text-caption tabular-nums text-muted-foreground"
                        >
                          {new Date(event.timestamp).toLocaleString(locale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </div>
                      {event.note ? (
                        <p className="mt-1 text-body-sm text-muted-foreground">{event.note}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-4 text-caption text-muted-foreground">
              <span>
                {t("lastUpdated", {
                  date: new Date(tracking.updatedAt).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </span>
              <Badge variant="secondary">{t("statusLabel", {
                status: tracking.status,
              })}</Badge>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
