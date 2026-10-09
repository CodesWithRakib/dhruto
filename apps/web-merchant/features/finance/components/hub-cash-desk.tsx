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
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { CheckCircle2, AlertTriangle, Coins, RefreshCw } from "lucide-react";
import {
  type PendingReconciliationItem,
  type CashHandInBatchItem,
  type CashDiscrepancyItem,
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
import { Link } from "@/lib/navigation";

type CashTab = "pending" | "batches" | "discrepancies";

/**
 * Hub cash desk: pending collections, hand-in batches and discrepancies.
 * Verification requires an explicit confirmation showing the counted amount;
 * a counted-vs-expected difference opens a discrepancy instead of being
 * absorbed.
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

  const pendingColumns: ColumnDef<PendingReconciliationItem>[] = React.useMemo(() => [
    {
      accessorKey: "trackingCode",
      header: "Tracking ID",
      cell: ({ row }) => (
        <Link
          href={`/track?code=${row.original.trackingCode}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.trackingCode}
        </Link>
      ),
    },
    {
      accessorKey: "riderName",
      header: "Rider",
      cell: ({ row }) => <span className="text-xs font-medium text-foreground">{row.original.riderName}</span>,
    },
    {
      accessorKey: "recipientName",
      header: "Recipient",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.recipientName}</span>,
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Collected COD</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
          {bdt(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "netPayable",
      header: () => <div className="text-right">Net Payable</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {bdt(row.original.netPayable)}
        </div>
      ),
    },
    {
      accessorKey: "handInStatus",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="text-[10px]">
            {row.original.handInStatus}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => openVerify(row.original)}
            className="h-7 gap-1.5 rounded-lg text-[11px] font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {t("verifyCash")}
          </Button>
        </div>
      ),
    },
  ], [bdt, t]);

  const batchesColumns: ColumnDef<CashHandInBatchItem>[] = React.useMemo(() => [
    {
      accessorKey: "handinCode",
      header: "Batch Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground">{row.original.handinCode}</span>
      ),
    },
    {
      accessorKey: "riderName",
      header: "Rider",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {row.original.riderName ?? row.original.riderId}
        </span>
      ),
    },
    {
      accessorKey: "itemCount",
      header: () => <div className="text-center">Parcels</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.itemCount}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "expectedMinor",
      header: () => <div className="text-right">Expected COD</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
          {bdt(row.original.expectedMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="CashHandInStatus"
            value={row.original.status}
            tones={CASH_HANDIN_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
  ], [bdt, t]);

  const discrepanciesColumns: ColumnDef<CashDiscrepancyItem>[] = React.useMemo(() => [
    {
      accessorKey: "type",
      header: "Discrepancy Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs font-bold text-foreground">{row.original.type}</span>
        </div>
      ),
    },
    {
      accessorKey: "expectedMinor",
      header: () => <div className="text-right">{t("cash.expectedCash")}</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
          {bdt(row.original.expectedMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "actualMinor",
      header: () => <div className="text-right">{t("cash.verifiedCash")}</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs tabular-nums text-foreground">
          {bdt(row.original.actualMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "differenceMinor",
      header: () => <div className="text-right">Difference</div>,
      cell: ({ row }) => {
        const diff = row.original.differenceMinor / 100;
        return (
          <div className="text-right font-mono text-xs font-bold tabular-nums text-danger">
            {diff < 0 ? `-৳${Math.abs(diff).toLocaleString()}` : diff > 0 ? `+৳${diff.toLocaleString()}` : "৳0"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="CashDiscrepancyStatus"
            value={row.original.status}
            tones={CASH_DISCREPANCY_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
  ], [bdt, t]);

  // Tab-specific client search & pagination
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

  const summaryCards = summary
    ? [
        {
          label: t("cash.expectedCash"),
          value: bdt(summary.totalPendingCod),
          icon: Coins,
          iconColor: "text-amber-600 dark:text-amber-400",
          iconBg: "bg-amber-500/10",
        },
        {
          label: t("admin.totalCod"),
          value: bdt(summary.totalVerifiedCod),
          icon: CheckCircle2,
          iconColor: "text-emerald-600 dark:text-emerald-400",
          iconBg: "bg-emerald-500/10",
        },
        {
          label: t("admin.openDiscrepancies"),
          value: `${summary.openDiscrepanciesCount}`,
          icon: AlertTriangle,
          iconColor: "text-rose-600 dark:text-rose-400",
          iconBg: "bg-rose-500/10",
        },
      ]
    : [];

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
              className="h-10 gap-2 rounded-xl text-xs border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("refresh")}
            </Button>
          </div>
        }
      />

      {summaryCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {summaryCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Card key={card.label} className="rounded-2xl border border-border/80 bg-card shadow-xs transition-all hover:shadow-sm">
                <CardContent className="flex items-center justify-between gap-3 p-5 sm:p-6">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                      {card.value}
                    </p>
                  </div>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 ${card.iconBg} ${card.iconColor}`}>
                    <IconComponent className="h-6 w-6" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div
        className="flex w-fit flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card/60 p-1.5 shadow-2xs"
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
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === entry.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
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
                    onLimitChange={(limit) => {
                      setPendingLimit(limit);
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
                        <Button size="sm" onClick={() => openVerify(item)} className="h-8 rounded-lg text-xs font-semibold shadow-xs">
                          {t("verifyCash")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "batches" ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
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
                    onLimitChange={(limit) => {
                      setBatchesLimit(limit);
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
                <ul className="divide-y divide-border/60 md:hidden">
                  {pagedBatches.map((batch) => (
                    <li key={batch.id} className="space-y-1.5 p-4 transition-colors hover:bg-muted/30">
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
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "discrepancies" ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
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
                    onLimitChange={(limit) => {
                      setDiscrepanciesLimit(limit);
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
                <ul className="divide-y divide-border/60 md:hidden">
                  {pagedDiscrepancies.map((item) => (
                    <li key={item.id} className="space-y-1.5 p-4 transition-colors hover:bg-muted/30">
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
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={verifying !== null} onOpenChange={(open) => !open && setVerifying(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("cash.verifyTitle")}</DialogTitle>
            <DialogDescription className="text-xs">{t("cash.verifyMessage")}</DialogDescription>
          </DialogHeader>
          {verifying ? (
            <div className="space-y-4 py-1">
              <dl className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-4 font-mono text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{verifying.trackingCode}</dt>
                  <dd className="font-bold tabular-nums text-foreground">{bdt(verifying.amount)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-muted-foreground">{t("settlements.netPayable")}</dt>
                  <dd className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {bdt(verifying.netPayable)}
                  </dd>
                </div>
              </dl>
              <div className="space-y-1.5">
                <label
                  htmlFor="counted-amount"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("cash.countedAmount")} *
                </label>
                <Input
                  id="counted-amount"
                  type="number"
                  min={0}
                  value={countedAmount}
                  onChange={(event) => setCountedAmount(event.target.value)}
                  className="h-12 rounded-xl font-mono text-lg"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="verify-notes"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("cash.verificationNotes")}
                </label>
                <Input
                  id="verify-notes"
                  value={verifyNotes}
                  onChange={(event) => setVerifyNotes(event.target.value)}
                  maxLength={500}
                  className="rounded-xl"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setVerifying(null)} className="rounded-xl">
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleVerify} disabled={isVerifying} className="rounded-xl shadow-xs">
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
