"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, GroupedBarChart } from "@dhruto/ui";
import type {
  HubAnalyticsItem,
  RiderAnalyticsItem,
  MerchantCompareItem,
} from "@dhruto/contracts";
import { SectionState, SimpleTable } from "./section-helpers";

export function HubsSection({
  isLoading,
  isError,
  hubs,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  hubs: HubAnalyticsItem[];
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={hubs.length === 0}
      onRetry={onRetry}
    >
      <div className="rounded-3xl bg-surface-elevated p-6 space-y-6">
        <SimpleTable
          head={["hub", "code", "incoming", "dispatched", "pending", "per-day", "oldest(h)"]}
          rows={hubs.map((h) => [
            h.hubName,
            h.code,
            h.incoming,
            h.dispatched,
            h.pending,
            h.throughputPerDay,
            h.oldestPendingHours,
          ])}
        />
        {hubs.map((h) => (
          <Card key={h.hubId} className="p-4 rounded-2xl bg-surface-muted/50">
            <h4 className="mb-2 text-sm font-semibold">
              {h.hubName} · {t("backlogTitle")}
            </h4>
            <GroupedBarChart
              data={h.backlog.map((b) => ({ label: b.bucket, value: b.count }))}
              tone="warning"
            />
          </Card>
        ))}
      </div>
    </SectionState>
  );
}

export function RidersSection({
  isLoading,
  isError,
  riders,
  limitations,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  riders: RiderAnalyticsItem[];
  limitations?: string;
  onRetry: () => void;
}) {
  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={riders.length === 0}
      onRetry={onRetry}
    >
      <div className="rounded-3xl bg-surface-elevated p-6 space-y-3">
        {limitations ? (
          <p className="text-[11px] text-muted-foreground">{limitations}</p>
        ) : null}
        <SimpleTable
          head={[
            "rider",
            "hub",
            "assigned",
            "delivered",
            "failed",
            "success%",
            "first%",
            "avg(h)",
            "cod",
          ]}
          rows={riders.map((r) => [
            r.name,
            r.hubName,
            r.assigned,
            r.delivered,
            r.failed,
            r.successRate,
            r.firstAttemptSuccess,
            r.avgCompletionHours,
            r.codCollected,
          ])}
        />
      </div>
    </SectionState>
  );
}

export function MerchantsSection({
  isLoading,
  isError,
  merchants,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  merchants: MerchantCompareItem[];
  onRetry: () => void;
}) {
  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={merchants.length === 0}
      onRetry={onRetry}
    >
      <div className="rounded-3xl bg-surface-elevated p-6">
        <SimpleTable
          head={["merchant", "parcels", "delivered", "success%", "rto%", "cod", "avg(h)"]}
          rows={merchants.map((m) => [
            m.merchantName,
            m.parcels,
            m.delivered,
            m.successRate,
            m.rtoRate,
            m.codVolume,
            m.avgDeliveryHours,
          ])}
        />
      </div>
    </SectionState>
  );
}
