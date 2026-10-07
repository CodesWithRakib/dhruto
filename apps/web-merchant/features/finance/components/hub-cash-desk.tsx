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
} from "@dhruto/ui";
import { CheckCircle2, AlertTriangle, Coins, RefreshCw } from "lucide-react";
import { type PendingReconciliationItem } from "@dhruto/contracts";
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

  const summaryCards = summary
    ? [
        { label: t("cash.expectedCash"), value: summary.totalPendingCod },
        { label: t("admin.totalCod"), value: summary.totalVerifiedCod },
        { label: t("admin.openDiscrepancies"), value: summary.openDiscrepanciesCount },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <PageHeader
        title={t("cash.title")}
        description={t("cash.subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchPending();
              refetchBatches();
              refetchDiscrepancies();
            }}
            className="h-10 gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("refresh")}
          </Button>
        }
      />

      {summaryCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {typeof card.value === "number"
                      ? `৳${card.value.toLocaleString()}`
                      : card.value}
                  </p>
                </div>
                <span className="rounded-lg bg-warning-soft p-2.5 text-warning">
                  <Coins className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div
        className="flex w-fit items-center gap-1.5 rounded-lg border border-border bg-surface-muted p-1"
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
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === entry.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p role="status" className="p-8 text-center text-xs text-muted-foreground">
                {t("loading")}
              </p>
            ) : pending.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CheckCircle2}
                  title={t("cash.emptyPending")}
                  description={t("cash.emptyPendingDescription")}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((item) => (
                  <li key={item.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.trackingCode}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.handInStatus}
                      </Badge>
                      <span className="ml-auto font-mono text-sm font-bold tabular-nums">
                        {bdt(item.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.recipientName} · {item.riderName} · {item.hubName}
                    </p>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => openVerify(item)} className="h-9 text-xs">
                        {t("verifyCash")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "batches" ? (
        <Card>
          <CardContent className="p-0">
            {batches.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Coins} title={t("cash.emptyBatches")} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {batches.map((batch) => (
                  <li key={batch.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {batch.handinCode}
                      </span>
                      <Badge
                        variant={
                          batch.status === "VERIFIED"
                            ? "success"
                            : batch.status === "DISCREPANCY"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {
                          <EnumBadge
                            namespace="CashHandInStatus"
                            value={batch.status}
                            tones={CASH_HANDIN_STATUS_TONE}
                          />
                        }
                      </Badge>
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                        {bdt(batch.expectedMinor / 100)} · {batch.itemCount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {batch.riderName ?? batch.riderId} · {batch.hubName ?? ""}
                    </p>
                  </li>
                ))}
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
                <EmptyState
                  icon={AlertTriangle}
                  title={t("cash.emptyDiscrepancies")}
                  description={t("cash.emptyDiscrepanciesDescription")}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {discrepancies.map((discrepancy) => (
                  <li key={discrepancy.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                      <span className="font-mono text-xs font-bold">{discrepancy.type}</span>
                      <Badge variant="destructive" className="text-[10px]">
                        {
                          <EnumBadge
                            namespace="CashDiscrepancyStatus"
                            value={discrepancy.status}
                            tones={CASH_DISCREPANCY_STATUS_TONE}
                          />
                        }
                      </Badge>
                      <span className="ml-auto font-mono text-xs font-bold tabular-nums text-danger">
                        {discrepancy.differenceMinor > 0 ? "+" : ""}৳
                        {(discrepancy.differenceMinor / 100).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t("cash.expectedCash")} {bdt(discrepancy.expectedMinor / 100)} ·{" "}
                      {t("cash.verifiedCash")} {bdt(discrepancy.actualMinor / 100)}
                    </p>
                    {discrepancy.notes ? (
                      <p className="text-xs text-muted-foreground">{discrepancy.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={verifying !== null} onOpenChange={(open) => !open && setVerifying(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cash.verifyTitle")}</DialogTitle>
            <DialogDescription>{t("cash.verifyMessage")}</DialogDescription>
          </DialogHeader>
          {verifying ? (
            <div className="space-y-4">
              <dl className="space-y-2 rounded-xl bg-surface-muted p-4 font-mono text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{verifying.trackingCode}</dt>
                  <dd className="font-bold tabular-nums">{bdt(verifying.amount)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-muted-foreground">{t("settlements.netPayable")}</dt>
                  <dd className="font-bold tabular-nums text-success">
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
                  className="h-12 font-mono text-lg"
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
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVerifying(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleVerify} disabled={isVerifying}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
