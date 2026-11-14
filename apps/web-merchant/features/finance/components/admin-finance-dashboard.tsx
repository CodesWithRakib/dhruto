"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Input,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dhruto/ui";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Wallet,
  Clock,
  ArrowDownToLine,
  Undo2,
  CreditCard,
  Building2,
} from "lucide-react";
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
import { PayoutInvoiceDialog } from "./payout-invoice-dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { KpiCard } from "@/components/data-display/kpi-card";
import { AdminIllustrationBg } from "@/components/visual/illustration-backgrounds";
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
  const [viewingVoucher, setViewingVoucher] = React.useState<PayoutRequestItem | null>(null);
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

  const tabs: Array<{ key: AdminTab; label: string; count?: number }> = [
    { key: "payouts", label: t("admin.payoutsTab"), count: payouts.length },
    { key: "journal", label: t("admin.journalTab"), count: journal.length },
    { key: "discrepancies", label: t("admin.openDiscrepancies"), count: discrepancies.length },
    { key: "adjust", label: t("admin.adjustmentsTab") },
    { key: "reports", label: t("admin.reportsTab") },
    { key: "check", label: t("admin.checkTab") },
  ];

  return (
    <div className="relative w-full space-y-6">
      {/* Dynamic Background Illustration Motif */}
      <AdminIllustrationBg opacity={0.35} />

      <PageHeader
        title={t("admin.title")}
        description={t("admin.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} className="h-10 gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("refresh")}</span>
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t("admin.totalCod")}
          value={overview ? `৳${overview.totalVerifiedCod.toLocaleString()}` : "৳0"}
          icon={Wallet}
          tone="primary"
          emphasis
          hint="Total cash collected from deliveries"
        />
        <KpiCard
          label={t("admin.pendingReconciliation")}
          value={overview ? `৳${overview.totalPendingCod.toLocaleString()}` : "৳0"}
          icon={Clock}
          tone="warning"
          hint="Cash in transit or unverified"
        />
        <KpiCard
          label={t("admin.merchantPayables")}
          value={overview ? `৳${overview.totalMerchantBalance.toLocaleString()}` : "৳0"}
          icon={ArrowDownToLine}
          tone="info"
          hint="Current aggregate merchant balance"
        />
        <KpiCard
          label={t("admin.disbursedPayouts")}
          value={overview ? `৳${overview.totalDisbursedPayouts.toLocaleString()}` : "৳0"}
          icon={CheckCircle2}
          tone="success"
          hint="Successfully settled merchant payouts"
        />
        <KpiCard
          label={t("admin.openDiscrepancies")}
          value={overview ? overview.openDiscrepanciesCount : 0}
          icon={AlertTriangle}
          tone="danger"
          hint="Unresolved rider/hub variances"
        />
      </div>

      {/* Modern Pill Navigation Tabs */}
      <div
        className="flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-surface-elevated p-1.5"
        role="tablist"
      >
        {tabs.map((entry) => {
          const isActive = tab === entry.key;
          return (
            <button
              key={entry.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(entry.key)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>{entry.label}</span>
              {typeof entry.count === "number" ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {entry.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYOUTS TABLE */}
      {tab === "payouts" ? (
        <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
          <CardContent className="p-0">
            {payouts.length === 0 ? (
              <div className="p-10">
                <EmptyState icon={CheckCircle2} title={t("payout.empty")} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-100 border-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Payout Code
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Date
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Method & Account
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Reference
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-center">
                        Status
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {payouts.map((payout) => (
                      <TableRow key={payout.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                          {payout.payoutCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(payout.createdAt)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground">
                              {payout.payoutMethod === "BANK_TRANSFER" ? (
                                <Building2 className="h-3.5 w-3.5" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5" />
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
                        <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {payout.status === "REQUESTED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold"
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
                                  className="h-8 text-xs font-bold"
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
                                  className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
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
                                className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setDecision("reject");
                                }}
                              >
                                {t("payout.reject")}
                              </Button>
                            ) : null}
                            {payout.status === "COMPLETED" || payout.status === "APPROVED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs font-bold"
                                onClick={() => setViewingVoucher(payout)}
                              >
                                <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                <span>{t("invoice.viewReceipt")}</span>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* TAB 2: JOURNAL TABLE */}
      {tab === "journal" ? (
        <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
          <CardContent className="p-0">
            {journal.length === 0 ? (
              <div className="p-10">
                <EmptyState icon={CheckCircle2} title={t("statement.empty")} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-100 border-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Transaction Code
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Type
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Debit Total
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Ledger Entries (Debit / Credit)
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-center">
                        Status
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {journal.map((txn) => {
                      const debit = txn.entries
                        .filter((e) => e.direction === "DEBIT")
                        .reduce((s, e) => s + e.amountMinor, 0);
                      return (
                        <TableRow key={txn.id} className="hover:bg-surface-muted/50 transition-colors">
                          <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                            {txn.transactionCode}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-xs font-semibold text-foreground whitespace-nowrap">
                            {txn.type}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-foreground text-right whitespace-nowrap">
                            {bdt(debit / 100)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-xs text-muted-foreground">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              {txn.entries.map((entry, index) => (
                                <p key={index} className="truncate">
                                  <span className={entry.direction === "DEBIT" ? "text-primary font-bold" : "text-foreground font-medium"}>
                                    {entry.direction}
                                  </span>{" "}
                                  <span className="text-muted-foreground">{entry.account}</span>{" "}
                                  <span className="font-bold text-foreground">{bdt(entry.amountMinor / 100)}</span>
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                            <EnumBadge
                              namespace="FinancialTransactionStatus"
                              value={txn.status}
                              tones={FINANCIAL_TXN_STATUS_TONE}
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                            {txn.status === "POSTED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs font-bold"
                                onClick={() => {
                                  setReverseId(txn.id);
                                  setReverseReason("");
                                }}
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                                <span>{t("admin.reverseTitle")}</span>
                              </Button>
                            ) : null}
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
      ) : null}

      {/* TAB 3: DISCREPANCIES TABLE */}
      {tab === "discrepancies" ? (
        <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
          <CardContent className="p-0">
            {discrepancies.length === 0 ? (
              <div className="p-10">
                <EmptyState icon={AlertTriangle} title={t("cash.emptyDiscrepancies")} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-100 border-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                        Discrepancy Type
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-center">
                        Status
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Expected Cash
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Verified Cash
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                        Net Variance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {discrepancies.map((d) => (
                      <TableRow key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TableCell className="px-4 py-3.5 font-bold text-xs text-foreground whitespace-nowrap">
                          {d.type}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                          <EnumBadge
                            namespace="CashDiscrepancyStatus"
                            value={d.status}
                            tones={CASH_DISCREPANCY_STATUS_TONE}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-xs tabular-nums text-muted-foreground text-right whitespace-nowrap">
                          {bdt(d.expectedMinor / 100)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-xs tabular-nums text-foreground text-right whitespace-nowrap">
                          {bdt(d.actualMinor / 100)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-danger text-right whitespace-nowrap">
                          {d.differenceMinor > 0 ? "+" : ""}
                          {bdt(d.differenceMinor / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* TAB 4: ADJUSTMENTS FORM */}
      {tab === "adjust" ? (
        <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
          <CardContent className="p-0">
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-foreground">{t("admin.adjustTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("admin.adjustMessage")}</p>
              </div>

              <form onSubmit={handleAdjust} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="adjust-merchant"
                    className="text-xs font-bold text-foreground"
                  >
                    Merchant Identifier (UUID) *
                  </label>
                  <Input
                    id="adjust-merchant"
                    value={adjustMerchant}
                    onChange={(e) => setAdjustMerchant(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    required
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Target merchant profile to post an audit adjustment debit or credit.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="adjust-direction"
                    className="text-xs font-bold text-foreground"
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
                    className="text-xs font-bold text-foreground"
                  >
                    {t("amount")} (BDT) *
                  </label>
                  <Input
                    id="adjust-amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="adjust-reason"
                    className="text-xs font-bold text-foreground"
                  >
                    {t("admin.adjustReason")} *
                  </label>
                  <Input
                    id="adjust-reason"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    maxLength={500}
                    placeholder="State clear operational reason for financial audit compliance..."
                    required
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <Button type="submit" disabled={isAdjusting} className="h-11 w-full font-bold">
                    {isAdjusting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("confirm")}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* TAB 5: REPORTS */}
      {tab === "reports" ? (
        <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
          <CardContent className="space-y-6 p-0 max-w-2xl">
            <div>
              <h3 className="text-base font-extrabold text-foreground">{t("admin.reportsTab")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Export verifiable double-entry transaction ledgers and platform fee collections.
              </p>
            </div>

            <div className="rounded-2xl bg-surface-muted/60 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cumulative Fee Collections
              </span>
              <p className="mt-1 font-mono text-2xl font-black text-foreground">
                {bdt(
                  fees.reduce(
                    (s, f) => s + Number((f as Record<string, unknown>).totalMinor ?? 0),
                    0,
                  ) / 100,
                )}
              </p>
            </div>

            <Button
              variant="outline"
              className="gap-2 font-bold"
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
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{t("admin.exportCsv")} (Journal)</span>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* TAB 6: RECONCILIATION CHECK */}
      {tab === "check" ? (
        <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
          <CardContent className="space-y-6 p-0">
            <div
              role="status"
              className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-bold ${
                check?.ok
                  ? "bg-success-soft text-success-soft-foreground"
                  : "bg-danger-soft text-danger-soft-foreground"
              }`}
            >
              {check?.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}
              <span className="text-sm">
                {check ? (check.ok ? t("admin.checkOk") : t("admin.checkFailed")) : t("loading")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-surface-muted/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkMerchants")}
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
                  {check?.merchants.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-muted/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkRiders")}
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
                  {check?.riders.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-muted/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkSettlements")}
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
                  {check?.settlements.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-muted/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.checkTransactions")}
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
                  {check?.transactions.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Payout Decision Dialog */}
      <Dialog
        open={selectedPayout !== null}
        onOpenChange={(open) => !open && setSelectedPayout(null)}
      >
        <DialogContent className="max-w-md bg-surface-elevated rounded-3xl">
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
            <dl className="space-y-2 rounded-2xl bg-surface-muted/60 p-4 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.payoutCode")}</dt>
                <dd className="font-bold text-foreground">{selectedPayout.payoutCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.requestedAmount")}</dt>
                <dd className="font-bold text-foreground tabular-nums">{bdt(Number(selectedPayout.amount))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.destination")}</dt>
                <dd className="text-foreground">{selectedPayout.accountDetails.accountNumber}</dd>
              </div>
            </dl>
          ) : null}
          {decision === "complete" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="payout-reference"
                className="text-xs font-bold text-foreground"
              >
                {t("payout.providerReference")}
              </label>
              <Input
                id="payout-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={100}
                placeholder="e.g. BEFTN-2026-981723 or bKash TrxID 9K28A7Z1"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter bank BEFTN/RTGS reference or MFS Transaction ID for audit and merchant invoice receipts.
              </p>
            </div>
          ) : null}
          {decision === "reject" || decision === "fail" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="payout-reason"
                className="text-xs font-bold text-foreground"
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSelectedPayout(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleDecision} disabled={isProcessing}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reversal Dialog */}
      <Dialog open={reverseId !== null} onOpenChange={(open) => !open && setReverseId(null)}>
        <DialogContent className="max-w-md bg-surface-elevated rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("admin.reverseTitle")}</DialogTitle>
            <DialogDescription>{t("admin.reverseMessage")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="reverse-reason" className="text-xs font-bold text-foreground">
              {t("admin.adjustReason")} *
            </label>
            <Input
              id="reverse-reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              maxLength={500}
              placeholder="State reason for ledger reversal..."
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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

      {/* Payout Voucher Dialog */}
      <PayoutInvoiceDialog
        open={viewingVoucher !== null}
        onOpenChange={(open) => !open && setViewingVoucher(null)}
        payout={viewingVoucher}
      />
    </div>
  );
}
