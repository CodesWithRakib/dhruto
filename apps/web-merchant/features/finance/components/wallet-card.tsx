"use client";

import React from "react";
import { type MerchantWalletData } from "@dhruto/contracts";
import { Wallet, Clock, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@dhruto/ui";

interface WalletCardProps {
  wallet?: MerchantWalletData;
  isLoading: boolean;
  onRequestPayout: () => void;
}

export function WalletCard({ wallet, isLoading, onRequestPayout }: WalletCardProps) {
  const balance = Number(wallet?.balance || 0);
  const pending = Number(wallet?.pendingBalance || 0);
  const withdrawn = Number(wallet?.withdrawnTotal || 0);
  const currency = wallet?.currency || "BDT";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Available Balance Hero Card */}
      <div className="lg:col-span-1 relative overflow-hidden rounded-3xl bg-surface-muted bg-success-soft bg-success-soft bg-surface-muted p-7 text-primary-foreground  shadow-emerald-950/20 border border-success flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-success-soft blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success-soft border border-success text-xs font-semibold text-success backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-success animate-pulse" />
              <span>Instant Payout Ready</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Wallet className="w-5 h-5 text-success" />
            </div>
          </div>

          <p className="text-success text-sm font-medium">Available Wallet Balance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              ৳{isLoading ? "..." : balance.toLocaleString()}
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-success">
              {currency}
            </span>
          </div>

          <p className="mt-2 text-xs text-success flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Safe, automated double-entry ledger settlement
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-success flex items-center gap-3">
          <Button
            id="open-payout-modal-btn"
            onClick={onRequestPayout}
            disabled={isLoading || balance < 100}
            className="w-full bg-white text-success hover:bg-success-soft font-bold py-3 rounded-2xl  transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            Request Payout Withdrawal
          </Button>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Pending Settlement Card */}
        <div className="relative rounded-3xl bg-surface-muted backdrop-blur-xl border border-border p-7 flex flex-col justify-between hover:border-warning transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warning-soft text-warning border border-warning">
              Pending Clearance
            </span>
            <div className="w-10 h-10 rounded-2xl bg-warning-soft border border-warning flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-warning" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-muted-foreground text-sm font-medium">Pending Delivery Collections</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">
                ৳{isLoading ? "..." : pending.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Cash on Delivery (COD) collected by riders, currently in transit to sorting hubs for physical verification.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-xs text-warning font-medium">
            Auto-settled net of delivery charges upon hub manager hand-in verification.
          </div>
        </div>

        {/* Lifetime Withdrawn Card */}
        <div className="relative rounded-3xl bg-surface-muted backdrop-blur-xl border border-border p-7 flex flex-col justify-between hover:border-primary transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary">
              Lifetime Disbursed
            </span>
            <div className="w-10 h-10 rounded-2xl bg-primary-soft border border-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-muted-foreground text-sm font-medium">Total Lifetime Withdrawals</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">
                ৳{isLoading ? "..." : withdrawn.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Total historical earnings transferred via bKash, Nagad, Rocket, or direct bank disbursements.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Minimum Payout: ৳100</span>
            <span className="text-success">Zero Processing Fee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
