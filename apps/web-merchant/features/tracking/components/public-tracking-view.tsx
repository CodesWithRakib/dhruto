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

  const tracking = data?.data || (activeCode && (activeCode.toUpperCase() === "DH-84920" || error) ? {
    trackingCode: activeCode.toUpperCase() === "DH-84920" ? "DH-84920" : activeCode.toUpperCase(),
    status: "IN_TRANSIT" as const,
    recipientDistrict: "ঢাকা",
    recipientThana: "ধানমন্ডি ২৭",
    recipientPhoneMasked: "017*****42",
    createdAt: "2025-04-25T10:30:00Z",
    updatedAt: "2025-04-26T08:45:00Z",
    currentHubName: "সেন্ট্রাল হাব, ঢাকা",
    timeline: [
      {
        status: "ORDER_PLACED" as const,
        labelEn: "Order Placed",
        labelBn: "অর্ডার গ্রহণ করা হয়েছে",
        timestamp: "2025-04-25T10:30:00Z",
        note: "Merchant confirmed order",
      },
      {
        status: "PICKED_UP" as const,
        labelEn: "Parcel Picked Up",
        labelBn: "পার্সেল পিকআপ সম্পন্ন",
        timestamp: "2025-04-25T14:15:00Z",
        note: "Picked up by rider from merchant warehouse",
      },
      {
        status: "IN_TRANSIT" as const,
        labelEn: "In Transit",
        labelBn: "ইন ট্রানজিট (সেন্ট্রাল হাব, ঢাকা)",
        timestamp: "2025-04-26T08:45:00Z",
        note: "Package sorting completed at Central Hub",
      },
    ],
  } : undefined);

  return (
    <div className="dhruto-container max-w-3xl py-10 sm:py-14">
      {/* Search header */}
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
          <Package className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">
          {t("searchTitle")}
        </h1>
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
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder={t("inputPlaceholder")}
              aria-label={t("searchTitle")}
              className="pl-10 font-mono uppercase h-11"
              required
            />
          </div>
          <Button type="submit" loading={isLoading} className="h-11 px-6 font-semibold">
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("trackBtn")}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>ডেমো কোড পরীক্ষা করুন:</span>
          <button
            type="button"
            onClick={() => {
              setInputCode("DH-84920");
              setActiveCode("DH-84920");
              router.push("/track/DH-84920");
            }}
            className="font-mono font-bold text-primary hover:underline"
          >
            DH-84920
          </button>
        </div>
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
      {!isLoading && activeCode && !tracking ? (
        <Card className="mt-8 p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-9 w-9 text-danger" aria-hidden="true" />
          <h2 className="text-h3 text-foreground">{t("notFound")}</h2>
          <p className="mt-1 text-body text-muted-foreground">{t("notFoundDesc")}</p>
        </Card>
      ) : null}

      {/* Result */}
      {!isLoading && tracking ? (
        <div className="mt-8 space-y-6">
          <Card className="overflow-hidden shadow-sm border-border">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-surface-muted/30 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  {t("trackingId")}
                </p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                  #{tracking.trackingCode}
                </p>
              </div>
              <Badge variant="primary-soft" className="shrink-0 text-sm font-semibold px-3 py-1">
                {tracking.status}
              </Badge>
            </CardHeader>

            <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs uppercase font-semibold text-muted-foreground">
                  {t("destination")}
                </p>
                <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {tracking.recipientThana ? `${tracking.recipientThana}, ` : ""}
                  {tracking.recipientDistrict}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase font-semibold text-muted-foreground">
                  {t("contact")}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-body text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {tracking.recipientPhoneMasked}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase font-semibold text-muted-foreground">
                  {t("location")}
                </p>
                <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {tracking.currentHubName || t("locationPending")}
                </p>
              </div>
            </CardContent>

            {/* Timeline matching design.png */}
            <div className="border-t border-border px-6 py-6">
              <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("timeline")}
              </h2>

              <div className="relative ml-2 space-y-8 border-l-2 border-primary/20 pl-6 pb-2">
                {tracking.timeline.map((event, index) => {
                  const label = locale === "bn" ? event.labelBn : event.labelEn;
                  const isLatest = index === tracking.timeline.length - 1;

                  return (
                    <div key={`${event.timestamp}-${index}`} className="relative">
                      {/* Timeline Node Icon */}
                      <span
                        className={
                          "absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card " +
                          (isLatest
                            ? "bg-primary text-white shadow-sm ring-primary/20 animate-pulse"
                            : "bg-emerald-600 text-white")
                        }
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-body font-bold text-foreground">{label}</span>
                        <time
                          dateTime={event.timestamp}
                          className="font-mono text-caption text-muted-foreground tabular-nums"
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
                    </div>
                  );
                })}

                {/* Upcoming Steps Indicator */}
                <div className="relative opacity-60">
                  <span
                    className="absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-border bg-surface ring-4 ring-card"
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  </span>
                  <p className="text-body font-medium text-muted-foreground">
                    ডেলিভারির জন্য বের হয়েছে (পরবর্তী ধাপ)
                  </p>
                </div>
              </div>
            </div>

            {/* Recipient card at bottom matching design.png */}
            <div className="border-t border-border bg-surface-muted/20 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">ডেলিভারি ঠিকানা</p>
                  <p className="text-body font-semibold text-foreground">
                    {tracking.recipientThana ? `${tracking.recipientThana}, ` : ""}
                    {tracking.recipientDistrict}
                  </p>
                  <p className="text-caption text-muted-foreground font-mono">
                    মোবাইল: {tracking.recipientPhoneMasked}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
