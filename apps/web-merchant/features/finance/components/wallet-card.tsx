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
      <div className="lg:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-7 text-white shadow-2xl shadow-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold text-emerald-200 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Instant Payout Ready</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Wallet className="w-5 h-5 text-emerald-200" />
            </div>
          </div>

          <p className="text-emerald-100/80 text-sm font-medium">Available Wallet Balance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              ৳{isLoading ? "..." : balance.toLocaleString()}
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-200/80">
              {currency}
            </span>
          </div>

          <p className="mt-2 text-xs text-emerald-100/70 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            Safe, automated double-entry ledger settlement
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-emerald-500/30 flex items-center gap-3">
          <Button
            id="open-payout-modal-btn"
            onClick={onRequestPayout}
            disabled={isLoading || balance < 100}
            className="w-full bg-white text-emerald-900 hover:bg-emerald-50 font-bold py-3 rounded-2xl shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            Request Payout Withdrawal
          </Button>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Pending Settlement Card */}
        <div className="relative rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-7 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Pending Clearance
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-slate-400 text-sm font-medium">Pending Delivery Collections</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-100">
                ৳{isLoading ? "..." : pending.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Cash on Delivery (COD) collected by riders, currently in transit to sorting hubs for physical verification.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-amber-400/90 font-medium">
            Auto-settled net of delivery charges upon hub manager hand-in verification.
          </div>
        </div>

        {/* Lifetime Withdrawn Card */}
        <div className="relative rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-7 flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Lifetime Disbursed
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-slate-400 text-sm font-medium">Total Lifetime Withdrawals</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-100">
                ৳{isLoading ? "..." : withdrawn.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Total historical earnings transferred via bKash, Nagad, Rocket, or direct bank disbursements.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Minimum Payout: ৳100</span>
            <span className="text-emerald-400">Zero Processing Fee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
