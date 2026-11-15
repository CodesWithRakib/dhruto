"use client";

import React from "react";
import { Plus, RefreshCw, RotateCcw, UploadCloud } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/cn";

interface ParcelListHeaderProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  createHref?: string | null;
  returnsHref?: string | null;
  onBulkOpen: () => void;
  onRefresh: () => void;
  isFetching: boolean;
  totalItems: number;
  activeFilterCount: number;
  formatNumber: (n: number) => string;
}

export function ParcelListHeader({
  t,
  createHref,
  returnsHref,
  onBulkOpen,
  onRefresh,
  isFetching,
  totalItems,
  activeFilterCount,
  formatNumber,
}: ParcelListHeaderProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {createHref ? (
              <Link href={createHref}>
                <Button size="sm" className="h-10 gap-2 text-xs rounded-xl shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">{t("create")}</span>
                </Button>
              </Link>
            ) : null}
            {createHref ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkOpen}
                className="h-10 gap-2 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-medium"
              >
                <UploadCloud className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("bulkImport")}
              </Button>
            ) : null}
            {returnsHref ? (
              <Link href={returnsHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-medium"
                >
                  <RotateCcw className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>Returns Hub</span>
                </Button>
              </Link>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="h-10 gap-2 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-medium"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-primary")}
                aria-hidden="true"
              />
              {t("refresh")}
            </Button>
          </div>
        }
      />

      {/* Result context chip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-elevated/80 px-3 py-1 shadow-xs backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            <span className="text-h4 font-black tabular-nums text-foreground">
              {formatNumber(totalItems)}
            </span>{" "}
            {t("countShipments")}
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
            {t("countFiltered", { count: activeFilterCount })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
