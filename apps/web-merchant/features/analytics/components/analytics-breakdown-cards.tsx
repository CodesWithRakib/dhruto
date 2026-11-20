"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Truck, Wallet } from "lucide-react";
import type { CodAnalyticsV2, RtoAnalyticsV2 } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

/** Shape of `/analytics/delivery` used here (latency in hours). */
export interface DeliveryAnalyticsView {
  latency: { count: number; avgHours: number | null; p50: number | null; p90: number | null };
  firstAttemptSuccess: number | null;
}

type T = ReturnType<typeof useTranslations>;

/** Hours → "< 1 min" / "18 min" / "5.5 h" / "2.1 d"; null → em dash. */
export function formatDuration(hours: number | null | undefined, t: T): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  const minutes = hours * 60;
  if (minutes < 1) return t("durUnderMinute");
  if (minutes < 60) return t("durMinutes", { n: Math.round(minutes) });
  if (hours < 48) return t("durHours", { n: Math.round(hours * 10) / 10 });
  return t("durDays", { n: Math.round((hours / 24) * 10) / 10 });
}

function Card({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Truck;
  tone: "primary" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface-elevated/85 p-6 space-y-4" aria-label={title}>
      <h3 className="flex items-center gap-2.5 text-body font-bold text-foreground">
        <span
          className={
            tone === "warning"
              ? "flex h-8 w-8 items-center justify-center rounded-xl bg-warning-soft text-warning-soft-foreground"
              : "flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"
          }
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted/60 p-3.5">
      <dt className="text-caption font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold tabular-nums text-foreground">{value}</dd>
      {hint ? <dd className="mt-0.5 text-caption text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

export function DeliveryBreakdownCard({ data }: { data?: DeliveryAnalyticsView }) {
  const t = useTranslations("MerchantAnalytics");
  const { number } = useFormatters();
  const latency = data?.latency;
  return (
    <Card icon={Truck} tone="primary" title={t("deliveryTitle")}>
      <dl className="grid grid-cols-2 gap-2.5">
        <Stat label={t("deliveryMedian")} value={formatDuration(latency?.p50, t)} hint={t("deliveryMedianHint")} />
        <Stat label={t("deliveryP90")} value={formatDuration(latency?.p90, t)} hint={t("deliveryP90Hint")} />
        <Stat
          label={t("deliveryFirstAttempt")}
          value={data?.firstAttemptSuccess != null ? `${data.firstAttemptSuccess}%` : "—"}
        />
        <Stat label={t("deliveredCount")} value={latency ? number(latency.count) : "—"} />
      </dl>
    </Card>
  );
}

export function RtoBreakdownCard({ data }: { data?: RtoAnalyticsV2 }) {
  const t = useTranslations("MerchantAnalytics");
  const tReason = useTranslations("Rider.failReasons");
  const { number } = useFormatters();
  const reasonLabel = (code: string) =>
    tReason.has(code) ? tReason(code) : code.replace(/_/g, " ").toLowerCase();
  const districts = (data?.byDistrict ?? []).filter((d) => d.count > 0).slice(0, 3);
  return (
    <Card icon={AlertTriangle} tone="warning" title={t("rtoTitle")}>
      <dl className="grid grid-cols-2 gap-2.5">
        <Stat label={t("rtoReturns")} value={data ? number(data.rtoCount) : "—"} />
        <Stat label={t("rtoRateLabel")} value={data?.rtoRate.noData ? "—" : `${data?.rtoRate.value ?? "—"}%`} />
      </dl>
      {(data?.byReason.length ?? 0) > 0 ? (
        <div className="space-y-1.5">
          <p className="text-caption font-semibold text-muted-foreground">{t("rtoReasonsTitle")}</p>
          {data!.byReason.slice(0, 4).map((r) => (
            <div key={r.reason} className="space-y-1">
              <div className="flex items-center justify-between text-caption">
                <span className="font-medium text-foreground first-letter:uppercase">{reasonLabel(r.reason)}</span>
                <span className="font-semibold tabular-nums text-muted-foreground">
                  {number(r.count)} · {r.percentage}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, r.percentage)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {districts.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-caption font-semibold text-muted-foreground">{t("rtoByDistrict")}</p>
          {districts.map((d) => (
            <div key={d.district} className="flex items-center justify-between rounded-xl bg-surface-muted/50 px-3 py-1.5 text-caption">
              <span className="font-medium text-foreground">{d.district}</span>
              <span className="tabular-nums text-muted-foreground">
                {d.rtoRate != null
                  ? t("rtoDistrictRow", { count: d.count, rate: d.rtoRate })
                  : t("rtoDistrictCount", { count: d.count })}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function CodBreakdownCard({ data }: { data?: CodAnalyticsV2 }) {
  const t = useTranslations("MerchantAnalytics");
  const { bdt } = useFormatters();
  return (
    <Card icon={Wallet} tone="primary" title={t("codTitle")}>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={t("codBooked")} value={data ? bdt(data.booked) : "—"} />
        <Stat label={t("codCollected")} value={data ? bdt(data.collected) : "—"} />
        <Stat label={t("codPending")} value={data ? bdt(data.pending) : "—"} />
        <Stat label={t("codRate")} value={data?.collectionRate != null ? `${data.collectionRate}%` : "—"} />
      </dl>
    </Card>
  );
}
