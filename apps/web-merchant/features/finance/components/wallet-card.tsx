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
  const currency = wallet?.currency || "BDT";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col justify-between rounded-3xl bg-success-soft/50 p-6 sm:p-7">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-bold text-success shadow-2xs">
              <Zap className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span>{t("availableBalance")}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-success shadow-2xs">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-success/90">{t("availableBalance")}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums tracking-tight text-foreground sm:text-5xl">
              {bdt(isLoading ? "…" : balance)}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-success">
              {currency}
            </span>
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("subtitle")}</span>
          </p>
        </div>

        <div className="mt-6 border-t border-success/20 pt-5">
          <Button
            id="open-payout-modal-btn"
            onClick={onRequestPayout}
            disabled={isLoading || balance < 100}
            className="flex w-full items-center justify-center gap-2 py-3 font-bold"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span>{t("requestPayout")}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
        <div className="flex flex-col justify-between rounded-3xl bg-surface-elevated p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning-soft-foreground">
              {t("pendingSettlement")}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning-soft text-warning">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("pendingSettlement")}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tabular-nums text-foreground sm:text-4xl">
                {bdt(isLoading ? "…" : pending)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-surface-elevated p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-soft-foreground">
              {t("lifetimeWithdrawn")}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lifetimeWithdrawn")}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tabular-nums text-foreground sm:text-4xl">
                {bdt(isLoading ? "…" : withdrawn)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
