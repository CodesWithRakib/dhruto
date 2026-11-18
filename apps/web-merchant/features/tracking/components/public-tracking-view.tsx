"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, DetailsSkeleton } from "@dhruto/ui";
import { AlertCircle } from "lucide-react";
import { useGetPublicTrackingQuery } from "@/features/parcels/api/parcels.api";
import { usePathname, useRouter } from "@/lib/navigation";
import { ErrorState, NotFoundState, RetryButton } from "@/components/feedback/states";
import { TrackingSearchBar } from "./tracking-search-bar";
import { TrackingStatusHero } from "./tracking-status-hero";
import { TrackingRouteInfo } from "./tracking-route-info";
import { TrackingMilestoneHistory } from "./tracking-milestone-history";

interface PublicTrackingViewProps {
  initialCode?: string;
  showIntro?: boolean;
  className?: string;
}

const RECENT_SEARCHES_KEY = "dhruto_recent_tracking_codes";

function saveRecentSearch(code: string) {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const updated = [code, ...prev.filter((c) => c !== code)].slice(0, 5);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Public and in-console shipment tracking cockpit.
 */
export function PublicTrackingView({ initialCode = "", showIntro = true, className }: PublicTrackingViewProps) {
  const t = useTranslations("Tracking");
  const router = useRouter();
  const pathname = usePathname();

  const trackBase = pathname.includes("/customer/track")
    ? "/customer/track"
    : pathname.includes("/merchant/track")
      ? "/merchant/track"
      : pathname.includes("/admin/track")
        ? "/admin/track"
        : "/track";

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode.trim());

  useEffect(() => {
    setInputCode(initialCode);
    setActiveCode(initialCode.trim());
  }, [initialCode]);

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

  const navigateToCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    saveRecentSearch(clean);
    setActiveCode(clean);
    setInputCode(clean);
    router.replace(`${trackBase}/${encodeURIComponent(clean)}`);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigateToCode(inputCode);
  };

  return (
    <div className={className ?? "dhruto-container max-w-4xl py-6 sm:py-10"}>
      {/* Search Header for Internal Dashboard Views or Standalone */}
      {showIntro ? (
        <TrackingSearchBar
          inputCode={inputCode}
          setInputCode={setInputCode}
          onSubmit={handleSearch}
          onSelectCode={navigateToCode}
          isFetching={isFetching}
        />
      ) : null}

      {/* Loading Skeleton & Error States */}
      <div aria-live="polite">
        {isFetching && !tracking ? (
          <div className="space-y-4">
            <DetailsSkeleton />
          </div>
        ) : showError ? (
          <Card className="p-4">
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
        </div>
      ) : null}

      {/* Live Tracking Telemetry Payload */}
      {!isFetching && tracking ? (
        <div className="space-y-8">
          <TrackingStatusHero
            trackingCode={tracking.trackingCode}
            status={tracking.status}
          />

          <TrackingRouteInfo
            recipientDistrict={tracking.recipientDistrict}
            recipientThana={tracking.recipientThana}
            currentHubName={tracking.currentHubName}
            recipientPhoneMasked={tracking.recipientPhoneMasked}
            updatedAt={tracking.updatedAt}
            status={tracking.status}
          />

          <TrackingMilestoneHistory
            timeline={tracking.timeline}
            updatedAt={tracking.updatedAt}
          />
        </div>
      ) : null}
    </div>
  );
}
