"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { type MerchantWalletData } from "@dhruto/contracts";
import { Wallet, Clock, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@dhruto/ui";
import { useFormatters } from "@/lib/format";

interface WalletCardProps {
  wallet?: MerchantWalletData;
  isLoading: boolean;
  onRequestPayout: () => void;
}

export function WalletCard({ wallet, isLoading, onRequestPayout }: WalletCardProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();
  const balance = Number(wallet?.balance || 0);
  const pending = Number(wallet?.pendingBalance || 0);
  const withdrawn = Number(wallet?.withdrawnTotal || 0);
  const inProgress = Number(wallet?.payoutsInProgress || 0);
  const currency = wallet?.currency || "BDT";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Primary Wallet Bento Card (Executive Obsidian / Emerald Glow) */}
      <div className="relative overflow-hidden flex flex-col justify-between rounded-3xl bg-gradient-to-br from-surface-elevated/95 via-surface-elevated/80 to-surface-muted/60 p-6 sm:p-7 backdrop-blur-md">
        {/* Top specular highlight line */}
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />

        <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{t("availableBalance")}</span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">{t("availableBalance")}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums tracking-tight text-foreground sm:text-5xl">
              {bdt(isLoading ? "…" : balance)}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {currency}
            </span>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-caption font-medium text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>{t("availableHint")}</span>
          </p>
        </div>

        <div className="relative z-10 mt-6 pt-5">
          <Button
            id="open-payout-modal-btn"
            onClick={onRequestPayout}
            disabled={isLoading || balance < 100}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span>{t("requestPayout")}</span>
          </Button>
        </div>
      </div>

      {/* Auxiliary Bento Cards: Pending & Lifetime */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
        {/* Pending Settlement Bento Card */}
        <div className="relative overflow-hidden flex flex-col justify-between rounded-3xl bg-surface-elevated/85 p-6 sm:p-7 backdrop-blur-md">
          {/* Top specular line */}

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
              {t("pendingSettlement")}
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <span className="block text-3xl font-black tabular-nums tracking-tight text-foreground sm:text-4xl">
              {bdt(isLoading ? "…" : pending)}
            </span>
            <p className="mt-2 text-caption text-muted-foreground">{t("pendingHint")}</p>
          </div>
        </div>

        {/* Lifetime Withdrawn Bento Card */}
        <div className="relative overflow-hidden flex flex-col justify-between rounded-3xl bg-surface-elevated/85 p-6 sm:p-7 backdrop-blur-md">
          {/* Top specular line */}

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {t("lifetimeWithdrawn")}
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <span className="block text-3xl font-black tabular-nums tracking-tight text-foreground sm:text-4xl">
              {bdt(isLoading ? "…" : withdrawn)}
            </span>
            <p className="mt-2 text-caption text-muted-foreground">{t("withdrawnHint")}</p>
            {inProgress > 0 ? (
              <p className="mt-1.5 inline-flex rounded-full bg-info-soft px-2.5 py-0.5 text-caption font-semibold text-info-soft-foreground">
                {t("payoutsInProgress", { amount: bdt(inProgress) })}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
