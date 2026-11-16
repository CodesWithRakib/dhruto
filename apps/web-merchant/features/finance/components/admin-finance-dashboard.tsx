"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { RefreshCw } from "lucide-react";
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
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { AdminIllustrationBg } from "@/components/visual/illustration-backgrounds";
import { AdminPayoutsTab } from "./admin/admin-payouts-tab";
import { AdminJournalTab } from "./admin/admin-journal-tab";
import { AdminDiscrepanciesTab } from "./admin/admin-discrepancies-tab";
import { AdminAdjustmentsTab } from "./admin/admin-adjustments-tab";
import { AdminReportsTab } from "./admin/admin-reports-tab";
import { AdminCheckTab } from "./admin/admin-check-tab";
import { PayoutDecisionDialog } from "./admin/payout-decision-dialog";
import { TransactionReversalDialog } from "./admin/transaction-reversal-dialog";
import { AdminFinanceKpis } from "./admin/admin-finance-kpis";
import { AdminFinanceTabsNav, type AdminTab, type TabEntry } from "./admin/admin-finance-tabs-nav";

/** Finance operations console: payouts, journal, adjustments, reports, checks. */
export function AdminFinanceDashboard() {
  const t = useTranslations("Finance");
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

  const tabs: TabEntry[] = [
    { key: "payouts", label: t("admin.payoutsTab"), count: payouts.length },
    { key: "journal", label: t("admin.journalTab"), count: journal.length },
    { key: "discrepancies", label: t("admin.openDiscrepancies"), count: discrepancies.length },
    { key: "adjust", label: t("admin.adjustmentsTab") },
    { key: "reports", label: t("admin.reportsTab") },
    { key: "check", label: t("admin.checkTab") },
  ];

  return (
    <div className="relative w-full space-y-6">
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

      <AdminFinanceKpis overview={overview} />

      <AdminFinanceTabsNav tabs={tabs} currentTab={tab} onTabChange={setTab} />

      {tab === "payouts" ? (
        <AdminPayoutsTab
          payouts={payouts}
          onApprove={(payout) => {
            setSelectedPayout(payout);
            setDecision("approve");
          }}
          onComplete={(payout) => {
            setSelectedPayout(payout);
            setDecision("complete");
          }}
          onFail={(payout) => {
            setSelectedPayout(payout);
            setDecision("fail");
          }}
          onReject={(payout) => {
            setSelectedPayout(payout);
            setDecision("reject");
          }}
          onViewVoucher={(payout) => setViewingVoucher(payout)}
        />
      ) : null}

      {tab === "journal" ? (
        <AdminJournalTab
          journal={journal}
          onReverse={(id) => {
            setReverseId(id);
            setReverseReason("");
          }}
        />
      ) : null}

      {tab === "discrepancies" ? (
        <AdminDiscrepanciesTab discrepancies={discrepancies} />
      ) : null}

      {tab === "adjust" ? (
        <AdminAdjustmentsTab
          adjustMerchant={adjustMerchant}
          setAdjustMerchant={setAdjustMerchant}
          adjustDirection={adjustDirection}
          setAdjustDirection={setAdjustDirection}
          adjustAmount={adjustAmount}
          setAdjustAmount={setAdjustAmount}
          adjustReason={adjustReason}
          setAdjustReason={setAdjustReason}
          onSubmit={handleAdjust}
          isAdjusting={isAdjusting}
        />
      ) : null}

      {tab === "reports" ? (
        <AdminReportsTab
          fees={fees}
          journal={journal}
          downloadCsv={downloadCsv}
        />
      ) : null}

      {tab === "check" ? (
        <AdminCheckTab check={check} />
      ) : null}

      <PayoutDecisionDialog
        payout={selectedPayout}
        decision={decision}
        reference={reference}
        setReference={setReference}
        reason={reason}
        setReason={setReason}
        onClose={() => setSelectedPayout(null)}
        onConfirm={handleDecision}
        isProcessing={isProcessing}
      />

      <TransactionReversalDialog
        reverseId={reverseId}
        reverseReason={reverseReason}
        setReverseReason={setReverseReason}
        onClose={() => setReverseId(null)}
        onConfirm={handleReverse}
        isReversing={isReversing}
      />

      <PayoutInvoiceDialog
        open={viewingVoucher !== null}
        onOpenChange={(open) => !open && setViewingVoucher(null)}
        payout={viewingVoucher}
      />
    </div>
  );
}
