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
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Printer,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import {
  applyColumnMapping,
  detectColumnMapping,
  generateSampleCsv,
  parseCsv,
  TARGET_FIELDS,
  type BulkBookingRow,
  type TargetFieldKey,
} from "../lib/csv";
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

type Step = "file" | "mapping" | "preview" | "result";

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const t = useTranslations("ParcelList");
  const routes = useRouteBase();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawRecords, setRawRecords] = useState<Array<Record<string, string>>>([]);
  const [columnMapping, setColumnMapping] = useState<Record<TargetFieldKey, string | null>>({
    recipientName: null,
    recipientPhone: null,
    deliveryAddress: null,
    district: null,
    thana: null,
    codAmount: null,
    weight: null,
    parcelDescription: null,
  });

  const [rows, setRows] = useState<BulkBookingRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<BulkPreviewRow[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const { data: template } = useGetBulkTemplateQuery(undefined, { skip: !open });
  const [validate, { isLoading: validating }] = useValidateBulkMutation();
  const [importRows, { isLoading: importing }] = useImportBulkMutation();

  const busy = validating || importing;

  const reset = () => {
    setFileName("");
    setFileSize(0);
    setDetectedHeaders([]);
    setRawRecords([]);
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

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "dhruto-bulk-booking-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample template downloaded");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setResult(null);
    setPreview([]);

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.errors.length > 0) {
        setParseErrors(parsed.errors);
        setRawRecords([]);
        setStep("file");
        return;
      }

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setParseErrors(["Spreadsheet does not contain any data rows."]);
        return;
      }

      setDetectedHeaders(parsed.headers);
      setRawRecords(parsed.rows);

      // Auto-detect mappings from headers
      const autoMapping = detectColumnMapping(parsed.headers);
      setColumnMapping(autoMapping);

      const mappedRows = parsed.rows.map((r) => applyColumnMapping(r, autoMapping));
      const maxLimit = template?.data?.maxRows ?? 500;
      const capped = mappedRows.slice(0, maxLimit);

      setParseErrors(
        mappedRows.length > capped.length
          ? [t("bulkOverLimit", { max: maxLimit })]
          : [],
      );

      setRows(capped);
      setStep("mapping");
    } catch {
      setParseErrors(["Failed to read the selected file. Please ensure it is a valid CSV or spreadsheet export."]);
    }
  };

  const handleMappingChange = (fieldKey: TargetFieldKey, headerValue: string) => {
    const updated = {
      ...columnMapping,
      [fieldKey]: headerValue === "" ? null : headerValue,
    };
    setColumnMapping(updated);

    const remapped = rawRecords.map((r) => applyColumnMapping(r, updated));
    setRows(remapped);
  };

  const allRequiredMapped = useMemo(() => {
    const requiredKeys: TargetFieldKey[] = ["recipientName", "recipientPhone", "deliveryAddress", "district", "codAmount"];
    return requiredKeys.every((k) => Boolean(columnMapping[k]));
  }, [columnMapping]);

  const previewRows = useMemo(() => {
    const byIndex = new Map(preview.map((p) => [p.index, p]));
    return rows.map((row, index) => ({ row, index, quote: byIndex.get(index) }));
  }, [rows, preview]);

  const totalCodAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.codAmount) || 0), 0);
  }, [rows]);

  const handleValidate = async () => {
    try {
      const res = await validate({ rows }).unwrap();
      if (!res.data) {
        toast.error(t("bulkValidateFailed"));
        return;
      }
      setPreview(res.data.rows);
      const bad = res.data.rows.filter((r) => !r.ok).length;
      if (bad > 0) {
        toast.warning(t("bulkPreviewIssues", { count: bad }));
      } else {
        toast.success(`All ${rows.length} rows validated successfully with pricing.`);
      }
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

  const createdParcelIds = useMemo(() => {
    if (!result?.rows) return [];
    return result.rows
      .filter((r) => r.ok && r.parcelId)
      .map((r) => r.parcelId as string);
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface border border-border/40 p-6 shadow-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold">{t("bulkTitle")}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload CSV, TSV, or spreadsheet order exports. Map columns, preview pricing, and batch-book in one click.
          </DialogDescription>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 pt-3 text-xs font-semibold">
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                step === "file"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-surface-muted text-muted-foreground"
              }`}
            >
              1. Upload File
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                step === "mapping"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-surface-muted text-muted-foreground"
              }`}
            >
              2. Column Mapper
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                step === "preview"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-surface-muted text-muted-foreground"
              }`}
            >
              3. Validate & Preview
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                step === "result"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-surface-muted text-muted-foreground"
              }`}
            >
              4. Results
            </span>
          </div>
        </DialogHeader>

        {/* STEP 1: FILE PICKER */}
        {step === "file" && (
          <div className="space-y-4 py-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
              className="hidden"
              aria-label={t("bulkPickFile")}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 p-8 text-center transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {fileName || "Click to browse or drag & drop order spreadsheet"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports CSV, TSV, or comma/tab delimited exports (up to 500 rows per batch)
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 mt-1">
                <FileUp className="h-4 w-4" />
                Select File
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-muted/60 p-3 border border-border/40">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Need standard formatting?</span> Download our pre-formatted spreadsheet template.
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownloadSample}
                className="gap-1.5 text-xs font-semibold rounded-xl text-primary hover:bg-primary/10"
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </Button>
            </div>

            {parseErrors.map((e) => (
              <p key={e} className="flex items-center gap-2 text-xs font-semibold text-danger" role="alert">
                <XCircle className="h-4 w-4 shrink-0" />
                {e}
              </p>
            ))}
          </div>
        )}

        {/* STEP 2: SMART COLUMN MAPPER */}
        {step === "mapping" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Smart Column Mapping Detected ({rows.length} records found)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    We automatically matched columns from your file. Verify or adjust dropdowns below.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {fileName} ({(fileSize / 1024).toFixed(1)} KB)
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/30 rounded-2xl border border-border/40 bg-surface-muted/30">
              {TARGET_FIELDS.map((field) => {
                const currentMapped = columnMapping[field.key];
                const sampleValue = currentMapped && rawRecords[0] ? rawRecords[0][currentMapped] : null;

                return (
                  <div
                    key={field.key}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between text-xs"
                  >
                    <div className="min-w-0 sm:w-1/3 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{field.label}</span>
                        {field.required ? (
                          <span className="text-[10px] font-bold text-danger">*</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">(optional)</span>
                        )}
                      </div>
                      {sampleValue ? (
                        <p className="truncate text-[10px] text-muted-foreground font-mono">
                          Sample: &ldquo;{sampleValue}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No sample preview</p>
                      )}
                    </div>

                    <div className="sm:w-2/3">
                      <select
                        value={currentMapped ?? ""}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-1 focus:ring-primary ${
                          currentMapped
                            ? "border-primary/40 bg-surface text-foreground font-semibold"
                            : field.required
                              ? "border-danger/50 bg-danger/5 text-danger font-bold"
                              : "border-border/60 bg-surface text-muted-foreground"
                        }`}
                      >
                        <option value="">— Unmapped / Skip —</option>
                        {detectedHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {!allRequiredMapped && (
              <p className="flex items-center gap-2 text-xs font-semibold text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Please map all required fields marked with * before continuing.
              </p>
            )}
          </div>
        )}

        {/* STEP 3: PREVIEW & VALIDATION */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface-muted/60 p-2.5 text-center border border-border/30">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Total Orders
                </span>
                <span className="text-base font-black text-foreground">{rows.length}</span>
              </div>
              <div className="rounded-xl bg-surface-muted/60 p-2.5 text-center border border-border/30">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Total COD
                </span>
                <span className="text-base font-black text-primary">৳{totalCodAmount.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-surface-muted/60 p-2.5 text-center border border-border/30">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Dry-Run Verified
                </span>
                <span className="text-base font-black text-foreground">
                  {preview.length > 0 ? `${preview.filter((p) => p.ok).length}/${preview.length}` : "Pending"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleValidate()}
                disabled={busy || rows.length === 0}
                className="gap-2 rounded-xl text-xs font-semibold"
              >
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                Validate Pricing & Delivery Zones
              </Button>
              <span className="text-xs text-muted-foreground">
                Showing first {Math.min(rows.length, 8)} rows preview
              </span>
            </div>

            {/* Row Previews */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-2xl border border-border/40 p-2 bg-surface-muted/20">
              {previewRows.slice(0, 10).map(({ row, index, quote }) => {
                const isBadPhone = !/^01[3-9]\d{8}$/.test(row.recipientPhone);
                const hasIssue = (quote && !quote.ok) || isBadPhone;

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition-colors ${
                      hasIssue ? "bg-danger/10 border border-danger/30" : "bg-card border border-border/30"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{row.recipientName}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{row.recipientPhone}</span>
                        {isBadPhone && (
                          <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 rounded">
                            Invalid Phone
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.deliveryAddress} ({row.district}{row.thana ? `, ${row.thana}` : ""})
                      </p>
                    </div>

                    <div className="shrink-0 text-right space-y-0.5">
                      <span className="font-mono font-bold text-foreground block">
                        COD: ৳{row.codAmount.toLocaleString()}
                      </span>
                      {quote && quote.ok && quote.deliveryFee !== undefined ? (
                        <span className="text-[10px] font-bold text-primary block">
                          Fee: ৳{quote.deliveryFee} ({quote.zone})
                        </span>
                      ) : quote && !quote.ok ? (
                        <span className="text-[10px] font-bold text-danger block truncate max-w-[120px]">
                          {quote.message || "Zone error"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: IMPORT RESULT */}
        {step === "result" && result && (
          <div className="space-y-4 py-3 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/20 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Batch Booking Processed
              </h3>
              <p className="text-xs text-muted-foreground">
                {result.created} of {result.total} packages created successfully.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="rounded-2xl bg-success/10 p-3 text-center border border-success/30">
                <span className="text-xs font-bold text-success block">Created</span>
                <span className="text-xl font-black text-foreground">{result.created}</span>
              </div>
              <div className="rounded-2xl bg-danger/10 p-3 text-center border border-danger/30">
                <span className="text-xs font-bold text-danger block">Failed</span>
                <span className="text-xl font-black text-foreground">{result.failed}</span>
              </div>
            </div>

            {/* 1-Click Print Thermal Labels For Newly Created Batch */}
            {createdParcelIds.length > 0 && (
              <div className="pt-2">
                <Link href={routes.bulkLabels(createdParcelIds)}>
                  <Button className="w-full gap-2 rounded-2xl h-11 text-xs font-bold">
                    <Printer className="h-4 w-4" />
                    Print All {createdParcelIds.length} Thermal Labels (4×6 in)
                  </Button>
                </Link>
              </div>
            )}

            {result.failed > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 text-left rounded-xl bg-danger/5 p-2.5 border border-danger/20 text-xs">
                <p className="font-bold text-danger mb-1">Failed Rows Details:</p>
                {result.rows
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <p key={r.index} className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                      Row #{r.index + 1}: {r.message || r.errorCode || "Validation failure"}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div>
            {step === "mapping" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("file")} className="rounded-xl gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Change File
              </Button>
            )}
            {step === "preview" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("mapping")} className="rounded-xl gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Edit Mapping
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === "mapping" && (
              <Button
                size="sm"
                disabled={!allRequiredMapped}
                onClick={() => setStep("preview")}
                className="rounded-xl gap-1.5 text-xs font-semibold"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {step === "preview" && (
              <Button
                size="sm"
                onClick={() => void handleImport()}
                disabled={busy || rows.length === 0}
                className="rounded-xl gap-2 text-xs font-bold"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Import {rows.length} Parcels Now
              </Button>
            )}

            {step === "result" && (
              <Button size="sm" variant="outline" onClick={() => handleClose(false)} className="rounded-xl text-xs">
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
