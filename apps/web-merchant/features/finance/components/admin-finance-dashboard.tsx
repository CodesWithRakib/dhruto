"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { RefreshCw, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { PayoutStatus, type PayoutRequestItem } from "@dhruto/contracts";
import {
  useGetFinanceOverviewQuery,
  useGetAdminPayoutsQuery,
  useApprovePayoutMutation,
  useProcessPayoutMutation,
  useGetJournalTransactionsQuery,
  useReverseTransactionMutation,
  useCreateAdjustmentMutation,
  useGetDiscrepanciesQuery,
  useGetReconciliationCheckQuery,
  useGetFeeReportQuery,
  newIdempotencyKey,
} from "../api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import {
  CASH_DISCREPANCY_STATUS_TONE,
  FINANCIAL_TXN_STATUS_TONE,
  PAYOUT_STATUS_TONE,
} from "@/config/status";

type AdminTab = "payouts" | "journal" | "discrepancies" | "adjust" | "reports" | "check";

/** Finance operations console: payouts, journal, adjustments, reports, checks. */
export function AdminFinanceDashboard() {
  const t = useTranslations("Finance");
  const { bdt, date: fmtDate } = useFormatters();
  const [tab, setTab] = React.useState<AdminTab>("payouts");
  const [selectedPayout, setSelectedPayout] = React.useState<PayoutRequestItem | null>(null);
  const [decision, setDecision] = React.useState<"approve" | "complete" | "reject" | "fail" | null>(
    null,
  );
  const [reference, setReference] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [adjustDirection, setAdjustDirection] = React.useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustMerchant, setAdjustMerchant] = React.useState("");
  const [adjustAmount, setAdjustAmount] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [reverseId, setReverseId] = React.useState<string | null>(null);
  const [reverseReason, setReverseReason] = React.useState("");

  const { data: overviewData, refetch: refetchOverview } = useGetFinanceOverviewQuery();
  const { data: payoutsData, refetch: refetchPayouts } = useGetAdminPayoutsQuery({ limit: 50 });
  const { data: journalData, refetch: refetchJournal } = useGetJournalTransactionsQuery({
    limit: 50,
  });
  const { data: discrepanciesData, refetch: refetchDiscrepancies } = useGetDiscrepanciesQuery();
  const { data: checkData, refetch: refetchCheck } = useGetReconciliationCheckQuery();
  const { data: feeData } = useGetFeeReportQuery();

  const [approvePayout] = useApprovePayoutMutation();
  const [processPayout, { isLoading: isProcessing }] = useProcessPayoutMutation();
  const [reverseTransaction, { isLoading: isReversing }] = useReverseTransactionMutation();
  const [createAdjustment, { isLoading: isAdjusting }] = useCreateAdjustmentMutation();

  const overview = overviewData?.data;
  const payouts = payoutsData?.data?.items ?? [];
  const journal = journalData?.data?.items ?? [];
  const discrepancies = discrepanciesData?.data ?? [];
  const check = checkData?.data;
  const fees = feeData?.data?.items ?? [];

  const refreshAll = () => {
    refetchOverview();
    refetchPayouts();
    refetchJournal();
    refetchDiscrepancies();
    refetchCheck();
  };

  const handleDecision = async () => {
    if (!selectedPayout || !decision) return;
    try {
      if (decision === "approve") {
        const res = await approvePayout({
          id: selectedPayout.id,
          notes: reason || undefined,
        }).unwrap();
        toast.success(res.message);
      } else {
        const status =
          decision === "complete"
            ? PayoutStatus.COMPLETED
            : decision === "fail"
              ? PayoutStatus.FAILED
              : PayoutStatus.REJECTED;
        const res = await processPayout({
          id: selectedPayout.id,
          dto: {
            status,
            transactionReference: reference.trim() || undefined,
            rejectionReason: decision === "reject" ? reason.trim() || undefined : undefined,
            failureReason: decision === "fail" ? reason.trim() || undefined : undefined,
          },
        }).unwrap();
        toast.success(res.message);
      }
      setSelectedPayout(null);
      setDecision(null);
      setReference("");
      setReason("");
      refreshAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("payout.payoutCode")));
    }
  };

  const handleAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await createAdjustment({
        dto: {
          merchantId: adjustMerchant.trim(),
          direction: adjustDirection,
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        },
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      toast.success(res.message);
      setAdjustMerchant("");
      setAdjustAmount("");
      setAdjustReason("");
      refreshAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.adjustTitle")));
    }
  };

  const handleReverse = async () => {
    if (!reverseId) return;
    try {
      const res = await reverseTransaction({
        id: reverseId,
        reason: reverseReason.trim(),
      }).unwrap();
      toast.success(res.message);
      setReverseId(null);
      setReverseReason("");
      refreshAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.reverseTitle")));
    }
  };

  const downloadCsv = (filename: string, columns: string[], rows: Record<string, unknown>[]) => {
    const escape = (value: unknown): string => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [
      columns.join(","),
      ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const metricCards = overview
    ? [
        { label: t("admin.totalCod"), value: `৳${overview.totalVerifiedCod.toLocaleString()}` },
        {
          label: t("admin.pendingReconciliation"),
          value: `৳${overview.totalPendingCod.toLocaleString()}`,
        },
        {
          label: t("admin.merchantPayables"),
          value: `৳${overview.totalMerchantBalance.toLocaleString()}`,
        },
        {
          label: t("admin.disbursedPayouts"),
          value: `৳${overview.totalDisbursedPayouts.toLocaleString()}`,
        },
        { label: t("admin.openDiscrepancies"), value: overview.openDiscrepanciesCount },
      ]
    : [];

  const tabs: Array<{ key: AdminTab; label: string }> = [
    { key: "payouts", label: t("admin.payoutsTab") },
    { key: "journal", label: t("admin.journalTab") },
    { key: "discrepancies", label: `${t("admin.openDiscrepancies")} (${discrepancies.length})` },
    { key: "adjust", label: t("admin.adjustmentsTab") },
    { key: "reports", label: t("admin.reportsTab") },
    { key: "check", label: t("admin.checkTab") },
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} className="h-10 gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("refresh")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        className="flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-lg border border-border bg-surface-muted p-1"
        role="tablist"
      >
        {tabs.map((entry) => (
          <button
            key={entry.key}
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={`whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === entry.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "payouts" ? (
        <Card>
          <CardContent className="p-0">
            {payouts.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={CheckCircle2} title={t("payout.empty")} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {payouts.map((payout) => (
                  <li key={payout.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {payout.payoutCode}
                      </span>
                      <Badge
                        variant={
                          payout.status === "COMPLETED"
                            ? "success"
                            : payout.status === "REQUESTED"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {
                          <EnumBadge
                            namespace="PayoutStatus"
                            value={payout.status}
                            tones={PAYOUT_STATUS_TONE}
                          />
                        }
                      </Badge>
                      <span className="ml-auto font-mono text-sm font-bold tabular-nums">
                        {bdt(Number(payout.amount))}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {payout.payoutMethod} · {payout.accountDetails.accountNumber} ·{" "}
                      {fmtDate(payout.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {payout.status === "REQUESTED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setDecision("approve");
                          }}
                        >
                          {t("payout.approve")}
                        </Button>
                      ) : null}
                      {payout.status === "APPROVED" || payout.status === "PROCESSING" ? (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setDecision("complete");
                            }}
                          >
                            {t("confirm")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setDecision("fail");
                            }}
                          >
                            {t("payout.failTitle")}
                          </Button>
                        </>
                      ) : null}
                      {payout.status === "REQUESTED" || payout.status === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-danger text-xs text-danger"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setDecision("reject");
                          }}
                        >
                          {t("payout.reject")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "journal" ? (
        <Card>
          <CardContent className="p-0">
            {journal.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={CheckCircle2} title={t("statement.empty")} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {journal.map((txn) => {
                  const debit = txn.entries
                    .filter((e) => e.direction === "DEBIT")
                    .reduce((s, e) => s + e.amountMinor, 0);
                  return (
                    <li key={txn.id} className="space-y-1 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {txn.transactionCode}
                        </span>
                        <Badge
                          variant={txn.status === "POSTED" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {txn.type} ·{" "}
                          {
                            <EnumBadge
                              namespace="FinancialTransactionStatus"
                              value={txn.status}
                              tones={FINANCIAL_TXN_STATUS_TONE}
                            />
                          }
                        </Badge>
                        <span className="ml-auto font-mono text-xs tabular-nums">
                          {bdt(debit / 100)}
                        </span>
                      </div>
                      <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                        {txn.entries.map((entry, index) => (
                          <p key={index}>
                            {entry.direction} {entry.account} {bdt(entry.amountMinor / 100)}
                          </p>
                        ))}
                      </div>
                      {txn.status === "POSTED" ? (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setReverseId(txn.id);
                              setReverseReason("");
                            }}
                          >
                            {t("admin.reverseTitle")}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "discrepancies" ? (
        <Card>
          <CardContent className="p-0">
            {discrepancies.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={AlertTriangle} title={t("cash.emptyDiscrepancies")} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {discrepancies.map((d) => (
                  <li key={d.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold">{d.type}</span>
                      <EnumBadge
                        namespace="CashDiscrepancyStatus"
                        value={d.status}
                        tones={CASH_DISCREPANCY_STATUS_TONE}
                      />
                      <span className="ml-auto font-mono text-xs font-bold tabular-nums text-danger">
                        {d.differenceMinor > 0 ? "+" : ""}
                        {bdt(d.differenceMinor / 100)}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t("cash.expectedCash")} {bdt(d.expectedMinor / 100)} ·{" "}
                      {t("cash.verifiedCash")} {bdt(d.actualMinor / 100)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "adjust" ? (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAdjust} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-xs text-muted-foreground">{t("admin.adjustMessage")}</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="adjust-merchant"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  merchantId *
                </label>
                <Input
                  id="adjust-merchant"
                  value={adjustMerchant}
                  onChange={(e) => setAdjustMerchant(e.target.value)}
                  placeholder="uuid"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="adjust-direction"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("admin.adjustDirection")} *
                </label>
                <Select
                  value={adjustDirection}
                  onValueChange={(val) => setAdjustDirection(val as "CREDIT" | "DEBIT")}
                >
                  <SelectTrigger id="adjust-direction" className="w-full">
                    <SelectValue placeholder={t("admin.adjustDirection")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">{t("admin.adjustCredit")}</SelectItem>
                    <SelectItem value="DEBIT">{t("admin.adjustDebit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="adjust-amount"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("amount")} *
                </label>
                <Input
                  id="adjust-amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="adjust-reason"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("admin.adjustReason")} *
                </label>
                <Input
                  id="adjust-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isAdjusting} className="h-11 w-full">
                  {t("confirm")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "reports" ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-bold">{t("admin.reportsTab")}</h3>
            <div className="rounded-lg bg-surface-muted p-3 text-xs">
              <p className="font-semibold">{t("admin.checkTransactions")}</p>
              <p className="font-mono tabular-nums">
                {fees.reduce(
                  (s, f) => s + Number((f as Record<string, unknown>).totalMinor ?? 0),
                  0,
                ) / 100}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() =>
                downloadCsv(
                  "journal.csv",
                  [
                    "transactionCode",
                    "type",
                    "status",
                    "referenceType",
                    "referenceId",
                    "createdAt",
                  ],
                  journal.map((txn) => ({ ...txn })),
                )
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {t("admin.exportCsv")} (journal)
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "check" ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
                check?.ok
                  ? "border-success bg-success-soft text-success"
                  : "border-danger bg-danger-soft text-danger"
              }`}
            >
              {check?.ok ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              )}
              {check ? (check.ok ? t("admin.checkOk") : t("admin.checkFailed")) : t("loading")}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkMerchants")}
                </p>
                <p className="font-mono text-lg font-bold tabular-nums">
                  {check?.merchants.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkRiders")}
                </p>
                <p className="font-mono text-lg font-bold tabular-nums">
                  {check?.riders.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkSettlements")}
                </p>
                <p className="font-mono text-lg font-bold tabular-nums">
                  {check?.settlements.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkTransactions")}
                </p>
                <p className="font-mono text-lg font-bold tabular-nums">
                  {check?.transactions.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Payout decision dialog with confirmation context */}
      <Dialog
        open={selectedPayout !== null}
        onOpenChange={(open) => !open && setSelectedPayout(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === "approve"
                ? t("payout.approveTitle")
                : decision === "reject"
                  ? t("payout.rejectTitle")
                  : decision === "fail"
                    ? t("payout.failTitle")
                    : t("payout.processTitle")}
            </DialogTitle>
            <DialogDescription>
              {decision === "approve"
                ? t("payout.approveMessage")
                : decision === "reject"
                  ? t("payout.rejectMessage")
                  : decision === "fail"
                    ? t("payout.failMessage")
                    : t("payout.processMessage")}
            </DialogDescription>
          </DialogHeader>
          {selectedPayout ? (
            <dl className="space-y-2 rounded-xl bg-surface-muted p-4 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.payoutCode")}</dt>
                <dd className="font-bold">{selectedPayout.payoutCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.requestedAmount")}</dt>
                <dd className="font-bold tabular-nums">{bdt(Number(selectedPayout.amount))}</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">{t("payout.destination")}</dt>
                <dd>{selectedPayout.accountDetails.accountNumber}</dd>
              </div>
            </dl>
          ) : null}
          {decision === "complete" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="payout-reference"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t("payout.providerReference")}
              </label>
              <Input
                id="payout-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={100}
              />
            </div>
          ) : null}
          {decision === "reject" || decision === "fail" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="payout-reason"
                className="text-xs font-semibold text-muted-foreground"
              >
                {decision === "reject" ? t("payout.rejectReason") : t("payout.failureReason")} *
              </label>
              <Input
                id="payout-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                required
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedPayout(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleDecision} disabled={isProcessing}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reversal dialog */}
      <Dialog open={reverseId !== null} onOpenChange={(open) => !open && setReverseId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.reverseTitle")}</DialogTitle>
            <DialogDescription>{t("admin.reverseMessage")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="reverse-reason" className="text-xs font-semibold text-muted-foreground">
              {t("admin.adjustReason")} *
            </label>
            <Input
              id="reverse-reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              maxLength={500}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReverseId(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleReverse}
              disabled={isReversing || reverseReason.trim().length < 5}
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
