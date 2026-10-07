"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@dhruto/ui";
import { useRequestReportMutation, useListReportsQuery } from "../api/analytics.api";
import type { ExportDataset } from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";

/**
 * Report export button: requests CSV/XLSX, polls the report list, downloads
 * base64 content as a file. Same RBAC/tenant scope as the read APIs.
 */
export function ExportButton({ dataset, preset, from, to }: {
  dataset: ExportDataset;
  preset?: string;
  from?: string;
  to?: string;
}) {
  const t = useTranslations("AnalyticsReports");
  const [format, setFormat] = React.useState<"csv" | "xlsx">("csv");
  const [error, setError] = React.useState<string | null>(null);
  const [request, { isLoading }] = useRequestReportMutation();
  const reports = useListReportsQuery(undefined, { skip: true });

  const handleExport = async () => {
    setError(null);
    try {
      const res = await request({ dataset, format, preset, from, to }).unwrap();
      const exportId = res.data?.id;
      if (!exportId) throw new Error("empty");
      // Poll briefly for READY (small exports complete inline; queued ones
      // appear via the reports list + in-app notification).
      let status = res.data?.status;
      for (let i = 0; i < 10 && status !== "READY"; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const list = await reports.refetch();
        status = list.data?.data?.find((r) => r.id === exportId)?.status;
      }
      if (status !== "READY") {
        setError(t("queuedHint"));
        return;
      }
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("dhruto_access_token")?.replace(/^["']|["']$/g, "") : null;
      const resp = await fetch(`${base}/analytics/reports/${exportId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const body = (await resp.json()) as { data?: { fileName?: string; format?: string; contentBase64?: string } };
      const contentBase64 = body.data?.contentBase64;
      if (!contentBase64) throw new Error("empty");
      const binary = atob(contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhruto-${dataset}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, t("requestFailed")));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-input p-0.5" role="radiogroup" aria-label={t("formatLabel")}>
        {(["csv", "xlsx"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium uppercase ${
              format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isLoading} onClick={handleExport}>
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : format === "xlsx" ? (
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {t("export")}
      </Button>
      {error && (
        <span role="alert" className="text-[11px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
