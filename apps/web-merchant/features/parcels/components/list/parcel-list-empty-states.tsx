"use client";

import React from "react";
import { Package, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { EmptyState, ErrorState, RetryButton } from "@/components/feedback/states";

interface ParcelListEmptyStatesProps {
  t: (key: string) => string;
  isError: boolean;
  hasActiveFilters: boolean;
  searchQuery: string;
  createHref?: string | null;
  onRefresh: () => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}

export function ParcelListEmptyStates({
  t,
  isError,
  hasActiveFilters,
  searchQuery,
  createHref,
  onRefresh,
  onClearSearch,
  onResetFilters,
}: ParcelListEmptyStatesProps) {
  if (isError) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-8 backdrop-blur-md">
        <ErrorState
          title={t("loadErrorTitle")}
          description={t("loadErrorDescription")}
          action={<RetryButton label={t("retry")} onRetry={onRefresh} />}
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/80 p-8 backdrop-blur-md">
      {hasActiveFilters ? (
        <EmptyState
          icon={SearchX}
          title={t("noResultsTitle")}
          description={t("noResultsHint")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {searchQuery.trim() ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={onClearSearch}
                >
                  <Search className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {t("clearSearch")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="rounded-xl"
              >
                {t("clearFilters")}
              </Button>
            </div>
          }
        />
      ) : (
        <EmptyState
          icon={Package}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <div className="flex flex-col items-center gap-3">
              {createHref ? (
                <Link href={createHref}>
                  <Button size="sm" className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{t("create")}</span>
                  </Button>
                </Link>
              ) : null}
              <p className="text-caption text-muted-foreground">{t("emptyHint")}</p>
            </div>
          }
        />
      )}
    </div>
  );
}
