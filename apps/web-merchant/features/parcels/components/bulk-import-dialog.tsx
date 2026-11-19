"use client";

import React, { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { CheckCircle2, FileUp, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { parseCsv, toBulkRow, type BulkBookingRow } from "../lib/csv";
import {
  useGetBulkTemplateQuery,
  useImportBulkMutation,
  useValidateBulkMutation,
  type BulkImportResult,
  type BulkPreviewRow,
} from "../api/parcels.api";
import { getApiErrorMessage } from "@/lib/api-error";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "file" | "preview" | "result";

/**
 * Phase 7: CSV bulk import on the parcels list page (bulk actions belong on
 * lists, not in the sidebar). Flow: pick .csv → parse locally → server
 * dry-run (pricing preview) → import with a batch idempotency key →
 * per-row results. Retrying with the same batch key replays safely.
 */
export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const t = useTranslations("ParcelList");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BulkBookingRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<BulkPreviewRow[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [step, setStep] = useState<Step>("file");

  const { data: template } = useGetBulkTemplateQuery(undefined, { skip: !open });
  const [validate, { isLoading: validating }] = useValidateBulkMutation();
  const [importRows, { isLoading: importing }] = useImportBulkMutation();

  const busy = validating || importing;

  const reset = () => {
    setFileName("");
    setRows([]);
    setParseErrors([]);
    setPreview([]);
    setResult(null);
    setStep("file");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setPreview([]);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.errors.length > 0) {
      setParseErrors(parsed.errors);
      setRows([]);
      setStep("file");
      return;
    }
    const mapped = parsed.rows.map(toBulkRow);
    const capped = template?.data?.maxRows ? mapped.slice(0, template.data.maxRows) : mapped;
    setParseErrors(
      mapped.length > capped.length
        ? [t("bulkOverLimit", { max: template?.data?.maxRows ?? 500 })]
        : [],
    );
    setRows(capped);
    setStep("preview");
  };

  const previewRows = useMemo(() => {
    const byIndex = new Map(preview.map((p) => [p.index, p]));
    return rows.map((row, index) => ({ row, index, quote: byIndex.get(index) }));
  }, [rows, preview]);

  const handleValidate = async () => {
    try {
      const res = await validate({ rows }).unwrap();
      if (!res.data) {
        toast.error(t("bulkValidateFailed"));
        return;
      }
      setPreview(res.data.rows);
      const bad = res.data.rows.filter((r) => !r.ok).length;
      if (bad > 0) toast.warning(t("bulkPreviewIssues", { count: bad }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bulkValidateFailed")));
    }
  };

  const handleImport = async () => {
    try {
      const batchKey = `bulk-ui-${Date.now()}-${crypto.randomUUID()}`;
      const res = await importRows({ rows, idempotencyKey: batchKey }).unwrap();
      if (!res.data) {
        toast.error(t("bulkImportFailed"));
        return;
      }
      setResult(res.data);
      setStep("result");
      if (res.data.failed > 0) {
        toast.warning(t("bulkImportPartial", { created: res.data.created, failed: res.data.failed }));
      } else {
        toast.success(t("bulkImportDone", { count: res.data.created }));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bulkImportFailed")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("bulkTitle")}</DialogTitle>
          <DialogDescription>{t("bulkDescription")}</DialogDescription>
        </DialogHeader>

        {step === "file" && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label={t("bulkPickFile")}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {fileName || t("bulkPickFile")}
            </Button>
            {template?.data ? (
              <p className="text-xs text-muted-foreground">
                {t("bulkTemplateHint", { columns: template.data.csvHeader })}
              </p>
            ) : null}
            {parseErrors.map((e) => (
              <p key={e} className="flex items-center gap-2 text-sm text-danger" role="alert">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {e}
              </p>
            ))}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("bulkRowsReady", { file: fileName, count: rows.length })}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleValidate()} disabled={busy || rows.length === 0}>
                {validating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {t("bulkValidate")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void handleImport()} disabled={busy || rows.length === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                {t("bulkImportAction")}
              </Button>
            </div>
            {previewRows.slice(0, 8).map(({ row, quote }) => (
              <div
                key={`${row.recipientPhone}-${row.recipientName}`}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{row.recipientName}</span>
                <span
                  className={
                    quote && !quote.ok
                      ? "max-w-[60%] text-right text-xs text-danger"
                      : "shrink-0 font-mono text-xs text-muted-foreground"
                  }
                >
                  {quote && quote.ok && quote.deliveryFee !== undefined
                    ? t("bulkFee", { fee: quote.deliveryFee })
                    : quote && !quote.ok
                      ? (quote.message ?? t("bulkQuoteFailed"))
                      : row.district}
                </span>
              </div>
            ))}
            {parseErrors.map((e) => (
              <p key={e} className="text-sm text-warning" role="alert">
                {e}
              </p>
            ))}
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              {t("bulkResult", { created: result.created, failed: result.failed })}
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {result.rows
                .filter((r) => !r.ok)
                .slice(0, 20)
                .map((r) => (
                  <p key={r.index} className="flex items-center gap-2 text-sm text-danger">
                    <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("bulkRowFailed", { index: r.index + 1, message: r.message ?? r.errorCode ?? "" })}
                  </p>
                ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step !== "file" && !busy ? (
            <Button variant="ghost" onClick={reset}>
              {t("bulkStartOver")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => handleClose(false)}>
            {step === "result" ? t("bulkDone") : t("bulkCancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
