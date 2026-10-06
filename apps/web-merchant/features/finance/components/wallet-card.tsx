"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { type MerchantWalletData } from "@dhruto/contracts";
import { Wallet, Clock, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@dhruto/ui";

interface WalletCardProps {
  wallet?: MerchantWalletData;
  isLoading: boolean;
  onRequestPayout: () => void;
}

export function WalletCard({ wallet, isLoading, onRequestPayout }: WalletCardProps) {
  const t = useTranslations("Finance");
  const balance = Number(wallet?.balance || 0);
  const pending = Number(wallet?.pendingBalance || 0);
  const withdrawn = Number(wallet?.withdrawnTotal || 0);
  const currency = wallet?.currency || "BDT";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col justify-between rounded-2xl border border-success bg-success-soft p-6">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full border border-success bg-surface px-3 py-1 text-xs font-semibold text-success">
              <Zap className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span>{t("availableBalance")}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-success bg-surface">
              <Wallet className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
          </div>

          <p className="text-sm font-medium text-success">{t("availableBalance")}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
              ৳{isLoading ? "…" : balance.toLocaleString()}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-success">
              {currency}
            </span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-6 border-t border-success pt-5">
          <Button
            id="open-payout-modal-btn"
            onClick={onRequestPayout}
            disabled={isLoading || balance < 100}
            className="flex w-full items-center justify-center gap-2 py-3 font-bold"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            {t("requestPayout")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-warning bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
              {t("pendingSettlement")}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-warning bg-warning-soft">
              <Clock className="h-5 w-5 text-warning" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground">{t("pendingSettlement")}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                ৳{isLoading ? "…" : pending.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              {t("lifetimeWithdrawn")}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary bg-primary-soft">
              <ArrowUpRight className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground">{t("lifetimeWithdrawn")}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                ৳{isLoading ? "…" : withdrawn.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{t("payout.minimum")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
