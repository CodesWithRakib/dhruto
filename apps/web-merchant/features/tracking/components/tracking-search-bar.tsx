"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { Package, Search, Zap, History, X } from "lucide-react";
import { useGetParcelsQuery } from "@/features/parcels/api/parcels.api";

interface TrackingSearchBarProps {
  inputCode: string;
  setInputCode: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectCode: (code: string) => void;
  isFetching?: boolean;
}

const RECENT_SEARCHES_KEY = "dhruto_recent_tracking_codes";

export function TrackingSearchBar({
  inputCode,
  setInputCode,
  onSubmit,
  onSelectCode,
  isFetching = false,
}: TrackingSearchBarProps) {
  const t = useTranslations("Tracking");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Safely attempt to fetch real merchant parcels if authenticated
  const { data: parcelsData } = useGetParcelsQuery(
    { limit: 4 },
    {
      // Don't error out if unauthenticated on public tracking
      refetchOnFocus: false,
    }
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const merchantParcels = parcelsData?.data ?? [];

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch {
      // No-op
    }
  };

  return (
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

      <form onSubmit={onSubmit} role="search" className="flex flex-col sm:flex-row gap-3">
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
        <Button
          type="submit"
          disabled={isFetching}
          className="h-12 gap-2 px-7 rounded-xl font-semibold shadow-md"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {t("trackBtn")}
        </Button>
      </form>

      {/* Dynamic real recent parcels or search history chips */}
      {merchantParcels.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Your active shipments:
          </span>
          <div className="flex flex-wrap gap-2">
            {merchantParcels.map((parcel) => (
              <button
                key={parcel.id}
                type="button"
                onClick={() => onSelectCode(parcel.trackingCode)}
                className="track-sample-chip"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{parcel.trackingCode}</span>
                <span className="text-[10px] text-muted-foreground">({parcel.status})</span>
              </button>
            ))}
          </div>
        </div>
      ) : recentSearches.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <History className="h-3.5 w-3.5 text-primary" />
            Recent searches:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {recentSearches.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onSelectCode(code)}
                className="track-sample-chip"
              >
                <span>{code}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[11px] text-muted-foreground/70 hover:text-foreground flex items-center gap-1 ml-1"
              title="Clear search history"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
