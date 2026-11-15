"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, DataTable, Badge } from "@dhruto/ui";
import { CheckCircle2, AlertTriangle, Coins, RefreshCw } from "lucide-react";
import {
  type PendingReconciliationItem,
} from "@dhruto/contracts";
import {
  useGetPendingReconciliationsQuery,
  useVerifyCashHandInMutation,
  useGetHubHandInsQuery,
  useGetDiscrepanciesQuery,
  useGetReconciliationSummaryQuery,
} from "../api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { CASH_HANDIN_STATUS_TONE, CASH_DISCREPANCY_STATUS_TONE } from "@/config/status";
import { useActiveHub } from "@/features/hubs/hooks/use-active-hub";
import { HubSelector } from "@/features/hubs/components/hub-selector";
import { CashDeskKpiStrip } from "./cash-desk/cash-desk-kpi-strip";
import { CashDeskVerifyDialog } from "./cash-desk/cash-desk-verify-dialog";
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
    [bdt, t]
  );

  const batchesColumns = React.useMemo(
    () =>
      getBatchesColumns({
        bdt,
        statusHeader: t("status"),
      }),
    [bdt, t]
  );

  const discrepanciesColumns = React.useMemo(
    () =>
      getDiscrepanciesColumns({
        bdt,
        statusHeader: t("status"),
        expectedHeader: t("cash.expectedCash"),
        verifiedHeader: t("cash.verifiedCash"),
      }),
    [bdt, t]
  );

  // Tab-specific search & pagination
  const [pendingSearch, setPendingSearch] = React.useState("");
  const [pendingPage, setPendingPage] = React.useState(1);
  const [pendingLimit, setPendingLimit] = React.useState(10);

  const [batchesSearch, setBatchesSearch] = React.useState("");
  const [batchesPage, setBatchesPage] = React.useState(1);
  const [batchesLimit, setBatchesLimit] = React.useState(10);

  const [discrepanciesSearch, setDiscrepanciesSearch] = React.useState("");
  const [discrepanciesPage, setDiscrepanciesPage] = React.useState(1);
  const [discrepanciesLimit, setDiscrepanciesLimit] = React.useState(10);

  const filteredPending = React.useMemo(() => {
    if (!pendingSearch.trim()) return pending;
    const q = pendingSearch.trim().toLowerCase();
    return pending.filter(
      (item) =>
        item.trackingCode.toLowerCase().includes(q) ||
        item.riderName.toLowerCase().includes(q) ||
        item.recipientName.toLowerCase().includes(q),
    );
  }, [pending, pendingSearch]);

  const pagedPending = React.useMemo(() => {
    const start = (pendingPage - 1) * pendingLimit;
    return filteredPending.slice(start, start + pendingLimit);
  }, [filteredPending, pendingPage, pendingLimit]);

  const filteredBatches = React.useMemo(() => {
    if (!batchesSearch.trim()) return batches;
    const q = batchesSearch.trim().toLowerCase();
    return batches.filter(
      (item) =>
        item.handinCode.toLowerCase().includes(q) ||
        (item.riderName?.toLowerCase().includes(q) ?? false),
    );
  }, [batches, batchesSearch]);

  const pagedBatches = React.useMemo(() => {
    const start = (batchesPage - 1) * batchesLimit;
    return filteredBatches.slice(start, start + batchesLimit);
  }, [filteredBatches, batchesPage, batchesLimit]);

  const filteredDiscrepancies = React.useMemo(() => {
    if (!discrepanciesSearch.trim()) return discrepancies;
    const q = discrepanciesSearch.trim().toLowerCase();
    return discrepancies.filter((item) => item.type.toLowerCase().includes(q));
  }, [discrepancies, discrepanciesSearch]);

  const pagedDiscrepancies = React.useMemo(() => {
    const start = (discrepanciesPage - 1) * discrepanciesLimit;
    return filteredDiscrepancies.slice(start, start + discrepanciesLimit);
  }, [filteredDiscrepancies, discrepanciesPage, discrepanciesLimit]);

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
              className="gap-2 rounded-xl text-xs shadow-2xs"
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
        className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md p-1.5 shadow-2xs"
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
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-4 shadow-sm">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : filteredPending.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CheckCircle2}
                title={t("cash.emptyPending")}
                description={t("cash.emptyPendingDescription")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={pendingColumns}
                  data={pagedPending}
                  totalItems={filteredPending.length}
                  pageCount={Math.max(1, Math.ceil(filteredPending.length / pendingLimit))}
                  currentPage={pendingPage}
                  itemsPerPage={pendingLimit}
                  onPageChange={setPendingPage}
                  onLimitChange={(lim) => {
                    setPendingLimit(lim);
                    setPendingPage(1);
                  }}
                  search={pendingSearch}
                  onSearchChange={(val) => {
                    setPendingSearch(val);
                    setPendingPage(1);
                  }}
                  searchPlaceholder="Search tracking ID, rider, or recipient..."
                  emptyMessage={t("cash.emptyPending")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <ul className="divide-y divide-border/60 md:hidden">
                {pagedPending.map((item) => (
                  <li key={item.id} className="space-y-2 p-4 transition-colors hover:bg-muted/30">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.trackingCode}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.handInStatus}
                      </Badge>
                      <span className="ml-auto font-mono text-sm font-bold tabular-nums text-foreground">
                        {bdt(item.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.recipientName} · {item.riderName} · {item.hubName}
                    </p>
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        onClick={() => openVerify(item)}
                        className="h-8 rounded-lg text-xs font-semibold shadow-xs"
                      >
                        {t("verifyCash")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {tab === "batches" ? (
        <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-4 shadow-sm">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          {filteredBatches.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Coins} title={t("cash.emptyBatches")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={batchesColumns}
                  data={pagedBatches}
                  totalItems={filteredBatches.length}
                  pageCount={Math.max(1, Math.ceil(filteredBatches.length / batchesLimit))}
                  currentPage={batchesPage}
                  itemsPerPage={batchesLimit}
                  onPageChange={setBatchesPage}
                  onLimitChange={(lim) => {
                    setBatchesLimit(lim);
                    setBatchesPage(1);
                  }}
                  search={batchesSearch}
                  onSearchChange={(val) => {
                    setBatchesSearch(val);
                    setBatchesPage(1);
                  }}
                  searchPlaceholder="Search batch code or rider..."
                  emptyMessage={t("cash.emptyBatches")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <div className="space-y-2 md:hidden">
                {pagedBatches.map((batch) => (
                  <div key={batch.id} className="space-y-1.5 rounded-2xl bg-surface-muted/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {batch.handinCode}
                      </span>
                      <EnumBadge
                        namespace="CashHandInStatus"
                        value={batch.status}
                        tones={CASH_HANDIN_STATUS_TONE}
                        className="text-[10px]"
                      />
                      <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-foreground">
                        {bdt(batch.expectedMinor / 100)} · {batch.itemCount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {batch.riderName ?? batch.riderId} · {batch.hubName ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "discrepancies" ? (
        <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-4 shadow-sm">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          {filteredDiscrepancies.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title={t("cash.emptyDiscrepancies")}
                description={t("cash.emptyDiscrepanciesDescription")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={discrepanciesColumns}
                  data={pagedDiscrepancies}
                  totalItems={filteredDiscrepancies.length}
                  pageCount={Math.max(1, Math.ceil(filteredDiscrepancies.length / discrepanciesLimit))}
                  currentPage={discrepanciesPage}
                  itemsPerPage={discrepanciesLimit}
                  onPageChange={setDiscrepanciesPage}
                  onLimitChange={(lim) => {
                    setDiscrepanciesLimit(lim);
                    setDiscrepanciesPage(1);
                  }}
                  search={discrepanciesSearch}
                  onSearchChange={(val) => {
                    setDiscrepanciesSearch(val);
                    setDiscrepanciesPage(1);
                  }}
                  searchPlaceholder="Filter discrepancies..."
                  emptyMessage={t("cash.emptyDiscrepancies")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <div className="space-y-2 md:hidden">
                {pagedDiscrepancies.map((item) => (
                  <div key={item.id} className="space-y-1.5 rounded-2xl bg-surface-muted/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {item.type}
                      </span>
                      <EnumBadge
                        namespace="CashDiscrepancyStatus"
                        value={item.status}
                        tones={CASH_DISCREPANCY_STATUS_TONE}
                        className="text-[10px]"
                      />
                      <span className="ml-auto font-mono text-xs font-bold tabular-nums text-danger">
                        {item.differenceMinor < 0
                          ? `-৳${Math.abs(item.differenceMinor / 100).toLocaleString()}`
                          : item.differenceMinor > 0
                            ? `+৳${(item.differenceMinor / 100).toLocaleString()}`
                            : "৳0"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.trackingCode ?? item.reason ?? "Discrepancy"} · Expected {bdt(item.expectedMinor / 100)} · Verified {bdt(item.actualMinor / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
