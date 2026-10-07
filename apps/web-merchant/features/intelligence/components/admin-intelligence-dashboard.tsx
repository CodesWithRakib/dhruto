"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Database, Loader2, RefreshCw, Cpu, ClipboardList, History } from "lucide-react";
import { Button, Badge, Card } from "@dhruto/ui";
import {
  useGetIntelligenceVersionsQuery,
  useImportGeographyMutation,
  useGetIntelligenceMetricsQuery,
  useListOverridesQuery,
} from "../api/intelligence-admin.api";
import { PageHeader } from "@/components/page-header";
import { getApiErrorMessage } from "@/lib/api-error";

/** Admin-only intelligence operations: dataset, models, metrics, overrides. */
export function AdminIntelligenceDashboard() {
  const t = useTranslations("AdminIntelligence");
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const versions = useGetIntelligenceVersionsQuery();
  const metrics = useGetIntelligenceMetricsQuery();
  const overrides = useListOverridesQuery();
  const [runImport, { isLoading: isImporting }] = useImportGeographyMutation();

  const handleImport = async () => {
    setFeedback(null);
    try {
      await runImport().unwrap();
      versions.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("importFailed")));
    }
  };

  const data = versions.data?.data;
  const metricValues = metrics.data?.data ?? {};
  const overrideItems = overrides.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isImporting} className="h-9 gap-2">
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {t("import")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                versions.refetch();
                metrics.refetch();
                overrides.refetch();
              }}
              className="h-9 gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("refresh")}
            </Button>
          </div>
        }
      />

      {feedback && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {feedback}
        </div>
      )}

      {versions.isLoading ? (
        <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t("loading")}
        </Card>
      ) : versions.isError || !data ? (
        <Card className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("loadErrorDescription")}</p>
          <Button variant="outline" size="sm" onClick={() => versions.refetch()}>
            {t("retry")}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cpu className="h-4 w-4" aria-hidden="true" />
                {t("parser")}
              </div>
              <p className="mt-1 font-mono text-sm font-semibold">{data.parserVersion}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("dataset", { version: data.activeDataset })}
              </p>
            </Card>
            {data.datasets.slice(0, 1).map((d) => (
              <Card key={d.version} className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-4 w-4" aria-hidden="true" />
                  {t("geography")}
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {t("geoCounts", { districts: d.districts, upazilas: d.upazilas })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {d.source} · {new Date(d.importedAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {t("models")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.models.map((m) => (
                  <Badge key={`${m.name}-${m.version}`} variant={m.status === "ACTIVE" ? "default" : "secondary"} className="font-mono text-[10px]">
                    {m.name}@{m.version} · {m.status}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("metricsTitle")}</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(metricValues).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-3 text-center">
                  <dt className="text-[11px] text-muted-foreground">{t(`metric_${k}`)}</dt>
                  <dd className="text-xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">
                {t("overridesTitle")} ({overrideItems.length})
              </h3>
            </div>
            {overrideItems.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">{t("overridesEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {overrideItems.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-xs">
                    <Badge variant="outline" className="font-mono text-[10px]">{o.action}</Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">{o.parcelId.slice(0, 8)}…</span>
                    <Badge variant="secondary">{o.overrideDecision}</Badge>
                    {o.overrideReason && (
                      <span className="max-w-full truncate text-muted-foreground">{o.overrideReason}</span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {o.overriddenAt ? new Date(o.overriddenAt).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
