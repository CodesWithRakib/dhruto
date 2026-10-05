"use client";

import React, { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  Input,
} from "@dhruto/ui";
import { Search, Package, MapPin, Phone, Building2, Clock, AlertCircle, Check } from "lucide-react";
import { useGetPublicTrackingQuery } from "../../parcels/api/parcels.api";

interface PublicTrackingViewProps {
  initialCode?: string;
}

export function PublicTrackingView({ initialCode = "" }: PublicTrackingViewProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const router = useRouter();

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);

  const { data, isLoading, error } = useGetPublicTrackingQuery(activeCode, {
    skip: !activeCode,
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = inputCode.trim();
    if (clean) {
      setActiveCode(clean);
      router.push(`/track/${encodeURIComponent(clean)}`);
    }
  };

  const tracking = data?.data;

  return (
    <div className="dhruto-container max-w-3xl py-10 sm:py-14">
      {/* Search header */}
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Package className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-h1 text-foreground text-balance">{t("searchTitle")}</h1>
        <p className="mx-auto max-w-md text-body text-muted-foreground text-pretty">
          {t("searchSubtitle")}
        </p>

        {/* Stacks on small screens so the input never gets squeezed. */}
        <form
          onSubmit={handleSearch}
          role="search"
          className="mx-auto flex w-full max-w-lg flex-col gap-2 pt-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder={t("inputPlaceholder")}
              aria-label={t("searchTitle")}
              className="pl-9 font-mono uppercase"
              required
            />
          </div>
          <Button type="submit" loading={isLoading}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("trackBtn")}
          </Button>
        </form>
      </div>

      {/* Loading */}
      {isLoading ? (
        <p
          role="status"
          aria-live="polite"
          className="py-12 text-center text-body text-muted-foreground"
        >
          {t("loading")}
        </p>
      ) : null}

      {/* Not found / error */}
      {!isLoading && activeCode && (error || !tracking) ? (
        <Card className="mt-8 p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-9 w-9 text-danger" aria-hidden="true" />
          <h2 className="text-h3 text-foreground">{t("notFound")}</h2>
          <p className="mt-1 text-body text-muted-foreground">{t("notFoundDesc")}</p>
        </Card>
      ) : null}

      {/* Result */}
      {!isLoading && tracking ? (
        <Card className="mt-8">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-border">
            <div>
              <p className="dhruto-eyebrow">{t("trackingId")}</p>
              <p className="font-mono text-h3 text-foreground tabular-nums">
                {tracking.trackingCode}
              </p>
            </div>
            <Badge variant="primary-soft" className="shrink-0 text-body-sm">
              {tracking.status}
            </Badge>
          </CardHeader>

          <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="dhruto-eyebrow">{t("destination")}</p>
              <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {tracking.recipientThana ? `${tracking.recipientThana}, ` : ""}
                {tracking.recipientDistrict}
              </p>
            </div>

            <div className="space-y-1">
              <p className="dhruto-eyebrow">{t("contact")}</p>
              <p className="flex items-center gap-1.5 font-mono text-body text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {tracking.recipientPhoneMasked}
              </p>
            </div>

            <div className="space-y-1">
              <p className="dhruto-eyebrow">{t("location")}</p>
              <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {tracking.currentHubName || t("locationPending")}
              </p>
            </div>
          </CardContent>

          <CardContent className="pt-0">
            <h2 className="dhruto-eyebrow mb-4 flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t("timeline")}
            </h2>

            <ol className="relative ml-3 space-y-6 border-l border-border">
              {tracking.timeline.map((event, index) => {
                const label = locale === "bn" ? event.labelBn : event.labelEn;
                const isLatest = index === tracking.timeline.length - 1;

                return (
                  <li key={`${event.timestamp}-${index}`} className="ml-6">
                    <span
                      className={
                        "absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-card " +
                        (isLatest
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-muted-foreground")
                      }
                      aria-hidden="true"
                    >
                      {isLatest ? null : <Check className="h-3 w-3" />}
                    </span>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-body font-semibold text-foreground">{label}</span>
                      <time
                        dateTime={event.timestamp}
                        className="font-mono text-caption text-muted-foreground tabular-nums"
                      >
                        {new Date(event.timestamp).toLocaleString(locale)}
                      </time>
                    </div>
                    {event.note ? (
                      <p className="mt-0.5 text-body-sm text-muted-foreground">{event.note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
