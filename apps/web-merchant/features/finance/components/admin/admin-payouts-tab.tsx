"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dhruto/ui";
import {
  Building2,
  CheckCircle2,
  FileText,
  Download,
  Zap,
  Loader2,
  X,
  Smartphone,
} from "lucide-react";
import { PayoutMethod, PayoutStatus, type PayoutRequestItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { EmptyState } from "@/components/feedback/states";
import { PAYOUT_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";
import { useBulkDisbursePayoutsMutation } from "../../api/finance.api";

interface AdminPayoutsTabProps {
  payouts: PayoutRequestItem[];
  onApprove: (payout: PayoutRequestItem) => void;
  onComplete: (payout: PayoutRequestItem) => void;
  onFail: (payout: PayoutRequestItem) => void;
  onReject: (payout: PayoutRequestItem) => void;
  onViewVoucher: (payout: PayoutRequestItem) => void;
}

type ChannelFilter = "ALL" | PayoutMethod;
type StateFilter = "ALL" | "ACTIONABLE" | PayoutStatus;

export function AdminPayoutsTab({
  payouts,
  onApprove,
  onComplete,
  onFail,
  onReject,
  onViewVoucher,
}: AdminPayoutsTabProps) {
  const t = useTranslations("Finance");
  const { bdt, date: fmtDate } = useFormatters();

  const [channelFilter, setChannelFilter] = React.useState<ChannelFilter>("ALL");
  const [stateFilter, setStateFilter] = React.useState<StateFilter>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [batchSuccessMessage, setBatchSuccessMessage] = React.useState<string | null>(null);

  const [bulkDisbursePayouts, { isLoading: isBulkDisbursing }] = useBulkDisbursePayoutsMutation();

  // Filtered rows based on channel and status
  const filteredPayouts = React.useMemo(() => {
    return payouts.filter((p) => {
      if (channelFilter !== "ALL" && p.payoutMethod !== channelFilter) return false;
      if (stateFilter === "ACTIONABLE") {
        return p.status === PayoutStatus.REQUESTED || p.status === PayoutStatus.APPROVED || p.status === PayoutStatus.PROCESSING;
      }
      if (stateFilter !== "ALL" && p.status !== stateFilter) return false;
      return true;
    });
  }, [payouts, channelFilter, stateFilter]);

  // Actionable items in the filtered view that can be disbursed in batch
  const actionableFiltered = React.useMemo(() => {
    return filteredPayouts.filter(
      (p) =>
        p.status === PayoutStatus.REQUESTED ||
        p.status === PayoutStatus.APPROVED ||
        p.status === PayoutStatus.PROCESSING,
    );
  }, [filteredPayouts]);

  // Selected payouts data
  const selectedPayouts = React.useMemo(() => {
    return payouts.filter((p) => selectedIds.has(p.id));
  }, [payouts, selectedIds]);

  const totalSelectedAmount = React.useMemo(() => {
    return selectedPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [selectedPayouts]);

  // Toggle single row selection
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all actionable in current view
  const toggleSelectAll = () => {
    if (actionableFiltered.length === 0) return;
    const allSelected = actionableFiltered.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        actionableFiltered.forEach((p) => next.delete(p.id));
      } else {
        actionableFiltered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const isAllActionableSelected =
    actionableFiltered.length > 0 && actionableFiltered.every((p) => selectedIds.has(p.id));

  // Batch disburse handler
  const handleBatchDisburse = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await bulkDisbursePayouts({
        payoutIds: ids,
        batchReference: `BATCH-${Date.now().toString().slice(-6)}`,
      }).unwrap();

      setSelectedIds(new Set());
      setBatchSuccessMessage(
        `Disbursed batch: ${res.data?.completed}/${res.data?.total} payouts completed (Total ${bdt(totalSelectedAmount)})`,
      );
      setTimeout(() => setBatchSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err?.data?.message || err?.message || "Failed to disburse batch");
    }
  };

  // Export MFS & Bank BEFTN CSV
  const handleExportCsv = () => {
    const listToExport = selectedPayouts.length > 0 ? selectedPayouts : filteredPayouts;
    if (listToExport.length === 0) return;

    const headers = [
      "Payout Code",
      "Created At",
      "Method",
      "Account Number",
      "Account Type",
      "Account Holder Name",
      "Bank Name",
      "Branch Name",
      "Amount (BDT)",
      "Status",
      "Reference",
    ];

    const rows = listToExport.map((p) => [
      p.payoutCode,
      new Date(p.createdAt).toISOString(),
      p.payoutMethod,
      `"${p.accountDetails?.accountNumber || ""}"`,
      p.accountDetails?.accountType || "PERSONAL",
      `"${p.accountDetails?.accountHolderName || ""}"`,
      `"${p.accountDetails?.bankName || ""}"`,
      `"${p.accountDetails?.branchName || ""}"`,
      p.amount,
      p.status,
      p.transactionReference || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `dhruto-payouts-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filter and Action Header Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-elevated p-3 sm:flex-row sm:items-center sm:justify-between border border-border/40 shadow-xs">
        {/* Left: Channel Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Channel:</span>
          <button
            type="button"
            onClick={() => setChannelFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              channelFilter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter(PayoutMethod.BKASH)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              channelFilter === PayoutMethod.BKASH
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3 w-3" />
            bKash
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter(PayoutMethod.NAGAD)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              channelFilter === PayoutMethod.NAGAD
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3 w-3" />
            Nagad
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter(PayoutMethod.ROCKET)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              channelFilter === PayoutMethod.ROCKET
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3 w-3" />
            Rocket
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter(PayoutMethod.BANK_TRANSFER)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              channelFilter === PayoutMethod.BANK_TRANSFER
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Building2 className="h-3 w-3" />
            Bank
          </button>
        </div>

        {/* Right: State Filter & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-surface-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setStateFilter("ALL")}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                stateFilter === "ALL"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStateFilter("ACTIONABLE")}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                stateFilter === "ACTIONABLE"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({payouts.filter((p) => p.status === PayoutStatus.REQUESTED || p.status === PayoutStatus.APPROVED).length})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter(PayoutStatus.COMPLETED)}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                stateFilter === PayoutStatus.COMPLETED
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredPayouts.length === 0}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {batchSuccessMessage && (
        <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-2.5 text-xs font-semibold text-success border border-success/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{batchSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBatchSuccessMessage(null)}
            className="p-1 hover:opacity-80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sticky Batch Action Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground text-background px-4 py-3 shadow-sm border border-foreground/10 animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/20 font-mono text-xs font-bold text-background">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                {selectedIds.size} payout{selectedIds.size > 1 ? "s" : ""} selected
              </p>
              <p className="text-[11px] text-background/80">
                Disbursement sum: <span className="font-mono font-bold text-accent">{bdt(totalSelectedAmount)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBatchDisburse}
              disabled={isBulkDisbursing}
              className="h-8 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold"
            >
              {isBulkDisbursing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Disbursing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Batch Disburse ({selectedIds.size})</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="h-8 gap-1.5 bg-transparent text-background border-background/30 hover:bg-background/10 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected CSV</span>
            </Button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg p-1.5 text-background/70 hover:bg-background/20 hover:text-background transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Payouts Table */}
      <Card className="rounded-2xl bg-surface-elevated overflow-hidden border border-border/40 shadow-xs">
        <CardContent className="p-0">
          {filteredPayouts.length === 0 ? (
            <div className="p-10">
              <EmptyState icon={CheckCircle2} title={t("payout.empty")} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-inverse text-inverse-foreground">
                  <TableRow className="hover:bg-transparent">
                    {/* Checkbox Header */}
                    <TableHead className="w-10 px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isAllActionableSelected}
                        onChange={toggleSelectAll}
                        disabled={actionableFiltered.length === 0}
                        aria-label="Select all actionable payouts"
                        className="h-4 w-4 rounded border-border/60 text-primary accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                      {t("admin.headers.payoutCode")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                      {t("admin.headers.date")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                      {t("admin.headers.methodAccount")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                      {t("admin.headers.reference")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-right">
                      {t("admin.headers.amount")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-center">
                      {t("admin.headers.status")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-right">
                      {t("admin.headers.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const isActionable =
                      payout.status === PayoutStatus.REQUESTED ||
                      payout.status === PayoutStatus.APPROVED ||
                      payout.status === PayoutStatus.PROCESSING;
                    const isSelected = selectedIds.has(payout.id);

                    return (
                      <TableRow
                        key={payout.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-primary-soft/40 hover:bg-primary-soft/60"
                            : "hover:bg-surface-muted/50"
                        }`}
                      >
                        {/* Checkbox Cell */}
                        <TableCell className="w-10 px-3 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isActionable}
                            onChange={() => toggleSelectRow(payout.id)}
                            aria-label={`Select payout ${payout.payoutCode}`}
                            className="h-4 w-4 rounded border-border/60 text-primary accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                          {payout.payoutCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(payout.createdAt)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground">
                              {payout.payoutMethod === PayoutMethod.BANK_TRANSFER ? (
                                <Building2 className="h-3.5 w-3.5" />
                              ) : (
                                <Smartphone className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">
                                {payout.payoutMethod}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {payout.accountDetails?.accountNumber || "—"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-xs text-foreground whitespace-nowrap">
                          {payout.transactionReference ? (
                            <span className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-primary">
                              {payout.transactionReference}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-foreground text-right whitespace-nowrap">
                          {bdt(Number(payout.amount))}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                          <EnumBadge
                            namespace="PayoutStatus"
                            value={payout.status}
                            tones={PAYOUT_STATUS_TONE}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {payout.status === "REQUESTED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold"
                                onClick={() => onApprove(payout)}
                              >
                                {t("payout.approve")}
                              </Button>
                            ) : null}
                            {payout.status === "APPROVED" || payout.status === "PROCESSING" ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-bold"
                                  onClick={() => onComplete(payout)}
                                >
                                  {t("payout.markPaid")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
                                  onClick={() => onFail(payout)}
                                >
                                  {t("payout.markFailed")}
                                </Button>
                              </>
                            ) : null}
                            {payout.status === "REQUESTED" || payout.status === "APPROVED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
                                onClick={() => onReject(payout)}
                              >
                                {t("payout.reject")}
                              </Button>
                            ) : null}
                            {payout.status === "COMPLETED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs font-bold"
                                onClick={() => onViewVoucher(payout)}
                              >
                                <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                <span>{t("invoice.viewReceipt")}</span>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
