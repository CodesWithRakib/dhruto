"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { RefreshCw } from "lucide-react";
import { type PendingReconciliationItem } from "@dhruto/contracts";
import {
  useGetPendingReconciliationsQuery,
  useVerifyCashHandInMutation,
  useGetHubHandInsQuery,
  useGetDiscrepanciesQuery,
  useGetReconciliationSummaryQuery,
} from "../api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { useActiveHub } from "@/features/hubs/hooks/use-active-hub";
import { HubSelector } from "@/features/hubs/components/hub-selector";
import { CashDeskKpiStrip } from "./cash-desk/cash-desk-kpi-strip";
import { CashDeskVerifyDialog } from "./cash-desk/cash-desk-verify-dialog";
import { CashDeskPendingTab } from "./cash-desk/cash-desk-pending-tab";
import { CashDeskBatchesTab } from "./cash-desk/cash-desk-batches-tab";
import { CashDeskDiscrepanciesTab } from "./cash-desk/cash-desk-discrepancies-tab";
import {
  getPendingColumns,
  getBatchesColumns,
  getDiscrepanciesColumns,
} from "./cash-desk/cash-desk-columns";

type CashTab = "pending" | "batches" | "discrepancies";

/**
 * Hub cash desk: pending collections, hand-in batches and discrepancies.
 * Verification requires an explicit confirmation showing the counted amount;
 * differences open a formal discrepancy ticket for finance review.
 */
export function HubCashDesk() {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();
  const { hubs, activeHubId, setActiveHubId } = useActiveHub();
  const [tab, setTab] = React.useState<CashTab>("pending");
  const [verifying, setVerifying] = React.useState<PendingReconciliationItem | null>(null);
  const [countedAmount, setCountedAmount] = React.useState("");
  const [verifyNotes, setVerifyNotes] = React.useState("");

  const { data: summaryRes } = useGetReconciliationSummaryQuery();
  const {
    data: pendingRes,
    isLoading,
    refetch: refetchPending,
  } = useGetPendingReconciliationsQuery();
  const { data: batchesRes, refetch: refetchBatches } = useGetHubHandInsQuery();
  const { data: discrepanciesRes, refetch: refetchDiscrepancies } = useGetDiscrepanciesQuery({
    status: "OPEN",
  });
  const [verifyCash, { isLoading: isVerifying }] = useVerifyCashHandInMutation();

  const summary = summaryRes?.data;
  const pending = pendingRes?.data ?? [];
  const batches = batchesRes?.data ?? [];
  const discrepancies = discrepanciesRes?.data ?? [];

  const openVerify = (item: PendingReconciliationItem) => {
    setVerifying(item);
    setCountedAmount(String(item.amount));
    setVerifyNotes("");
  };

  const handleVerify = async () => {
    if (!verifying) return;
    try {
      const res = await verifyCash({
        cashLedgerId: verifying.id,
        actualAmount: countedAmount.trim() === "" ? undefined : Number(countedAmount),
        notes: verifyNotes.trim() || undefined,
      }).unwrap();
      toast.success(res.message);
      setVerifying(null);
      refetchPending();
      refetchBatches();
      refetchDiscrepancies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("verifyCash")));
    }
  };

  const pendingColumns = React.useMemo(
    () =>
      getPendingColumns({
        onOpenVerify: openVerify,
        bdt,
        statusHeader: t("status"),
        actionsHeader: t("actions"),
        verifyCashText: t("verifyCash"),
      }),
    [bdt, t],
  );

  const batchesColumns = React.useMemo(
    () =>
      getBatchesColumns({
        bdt,
        statusHeader: t("status"),
      }),
    [bdt, t],
  );

  const discrepanciesColumns = React.useMemo(
    () =>
      getDiscrepanciesColumns({
        bdt,
        statusHeader: t("status"),
        expectedHeader: t("cash.expectedCash"),
        verifiedHeader: t("cash.verifiedCash"),
      }),
    [bdt, t],
  );

  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader
        title={t("cash.title")}
        description={t("cash.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <HubSelector hubs={hubs} activeHubId={activeHubId} onChange={setActiveHubId} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPending();
                refetchBatches();
                refetchDiscrepancies();
              }}
              className="gap-2 rounded-xl text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("refresh")}</span>
            </Button>
          </div>
        }
      />

      {summary ? (
        <CashDeskKpiStrip
          totalPendingCod={summary.totalPendingCod}
          totalVerifiedCod={summary.totalVerifiedCod}
          openDiscrepanciesCount={summary.openDiscrepanciesCount}
        />
      ) : null}

      <div
        className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl bg-card/90 backdrop-blur-md p-1.5"
        role="tablist"
      >
        {(
          [
            { key: "pending", label: `${t("cash.pendingTab")} (${pending.length})` },
            { key: "batches", label: `${t("cash.batchesTab")} (${batches.length})` },
            {
              key: "discrepancies",
              label: `${t("cash.discrepanciesTab")} (${discrepancies.length})`,
            },
          ] as Array<{ key: CashTab; label: string }>
        ).map((entry) => (
          <button
            key={entry.key}
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              tab === entry.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <CashDeskPendingTab
          isLoading={isLoading}
          pending={pending}
          pendingColumns={pendingColumns}
          onOpenVerify={openVerify}
        />
      ) : null}

      {tab === "batches" ? (
        <CashDeskBatchesTab
          batches={batches}
          batchesColumns={batchesColumns}
        />
      ) : null}

      {tab === "discrepancies" ? (
        <CashDeskDiscrepanciesTab
          discrepancies={discrepancies}
          discrepanciesColumns={discrepanciesColumns}
        />
      ) : null}

      <CashDeskVerifyDialog
        verifying={verifying}
        onClose={() => setVerifying(null)}
        countedAmount={countedAmount}
        setCountedAmount={setCountedAmount}
        verifyNotes={verifyNotes}
        setVerifyNotes={setVerifyNotes}
        onVerify={handleVerify}
        isVerifying={isVerifying}
      />
    </div>
  );
}
