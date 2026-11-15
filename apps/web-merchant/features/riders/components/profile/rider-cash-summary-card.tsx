"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { Wallet, RefreshCw, Clock, ShieldCheck, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { RiderCashSummary } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface RiderCashSummaryCardProps {
  cash: RiderCashSummary | undefined;
  hubName: string;
  cashFetching: boolean;
  onRefreshCash: () => void;
  handInNotes: string;
  setHandInNotes: (notes: string) => void;
  isHandingIn: boolean;
  onHandIn: (event: React.FormEvent) => void;
}

export function RiderCashSummaryCard({
  cash,
  hubName,
  cashFetching,
  onRefreshCash,
  handInNotes,
  setHandInNotes,
  isHandingIn,
  onHandIn,
}: RiderCashSummaryCardProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  return (
    <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-border/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning-soft text-warning-soft-foreground">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-foreground">
              {t("profile.cashTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              Track collections and submit cash directly to your designated hub
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onRefreshCash}
          className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          aria-label="Refresh cash records"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cashFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. To Hand In */}
        <div className="flex items-start justify-between rounded-2xl bg-surface-muted/40 p-4 transition-all hover:bg-surface-muted/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("profile.pendingHandIn")}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  (cash?.pendingHandIn ?? 0) > 0
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {(cash?.pendingHandIn ?? 0) > 0 ? "Action required" : "Settled"}
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
              {bdt(cash?.pendingHandIn ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">In rider possession</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        {/* 2. Awaiting Verification */}
        <div className="flex items-start justify-between rounded-2xl bg-surface-muted/40 p-4 transition-all hover:bg-surface-muted/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("profile.awaitingVerification")}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-200">
                Pending
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
              {bdt(cash?.awaitingVerification ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Submitted to hub</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-700 dark:text-blue-300">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        {/* 3. Verified by Hub */}
        <div className="flex items-start justify-between rounded-2xl bg-surface-muted/40 p-4 transition-all hover:bg-surface-muted/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("profile.verified")}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                Reconciled
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
              {bdt(cash?.verifiedByHub ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Hub reconciled</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Hand In Deposit Form or Inline Status Banner */}
      {(cash?.pendingHandIn ?? 0) > 0 ? (
        <form onSubmit={onHandIn} className="space-y-3.5 rounded-2xl bg-amber-500/10 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">Hand in cash to hub</h4>
              <p className="text-xs text-muted-foreground">
                Deposit {bdt(cash?.pendingHandIn ?? 0)} collected cash at {hubName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Deposit amount:</span>
              <span className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">
                {bdt(cash?.pendingHandIn ?? 0)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Input
              value={handInNotes}
              onChange={(event) => setHandInNotes(event.target.value)}
              placeholder={t("profile.handInNotes")}
              maxLength={500}
              aria-label={t("profile.handInNotes")}
              className="h-11 flex-1 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
            />
            <Button
              type="submit"
              disabled={isHandingIn}
              className="h-11 shrink-0 gap-2 rounded-2xl px-6 text-xs font-bold"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              {isHandingIn ? t("profile.handingIn") : t("profile.handIn")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-surface-muted/40 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-foreground">{t("profile.handInEmpty")}</span>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            Zero Balance
          </span>
        </div>
      )}
    </div>
  );
}
