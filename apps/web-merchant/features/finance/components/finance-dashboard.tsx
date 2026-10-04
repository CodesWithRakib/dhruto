"use client";

import React, { useState } from "react";
import {
  useGetMyWalletQuery,
  useGetWalletTransactionsQuery,
  useGetMyPayoutsQuery,
} from "../api/finance.api";
import { WalletCard } from "./wallet-card";
import { PayoutRequestModal } from "./payout-request-modal";
import { TransactionsTable } from "./transactions-table";
import { ReconciliationDesk } from "./reconciliation-desk";
import {
  ReceiptText,
  History,
  Building,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  Building2,
} from "lucide-react";
import { Button } from "@dhruto/ui";

export function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<"statement" | "payouts" | "reconciliation">("statement");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const {
    data: walletRes,
    isLoading: isWalletLoading,
    refetch: refetchWallet,
  } = useGetMyWalletQuery();

  const {
    data: txRes,
    isLoading: isTxLoading,
    refetch: refetchTx,
  } = useGetWalletTransactionsQuery();

  const {
    data: payoutsRes,
    isLoading: isPayoutsLoading,
    refetch: refetchPayouts,
  } = useGetMyPayoutsQuery();

  const wallet = walletRes?.data;
  const transactions = txRes?.data || [];
  const payouts = payoutsRes?.data || [];

  const handleRefresh = () => {
    refetchWallet();
    refetchTx();
    refetchPayouts();
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
          label: "Disbursed",
        };
      case "REQUESTED":
      case "PROCESSING":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: Clock,
          label: "Under Review",
        };
      case "REJECTED":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: XCircle,
          label: "Rejected & Refunded",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-400 border-slate-700",
          icon: Clock,
          label: status,
        };
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Finance & Wallet Hub</span>
            <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Live Settlement
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time cash reconciliation, double-entry automated COD credit, and instant multi-channel payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="rounded-2xl border-slate-800 text-slate-300 hover:bg-slate-800/80 flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Ledger</span>
          </Button>
        </div>
      </div>

      {/* Hero Financial Wallet Cards */}
      <WalletCard
        wallet={wallet}
        isLoading={isWalletLoading}
        onRequestPayout={() => setIsPayoutModalOpen(true)}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl w-fit">
        <button
          onClick={() => setActiveTab("statement")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "statement"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Statement & Audit Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "payouts"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payout History ({payouts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "reconciliation"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Hub Cash Desk (Operations)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "statement" && (
        <TransactionsTable transactions={transactions} isLoading={isTxLoading} />
      )}

      {activeTab === "payouts" && (
        <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Withdrawal Payout Requests
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Historical record of your withdrawal disbursement requests across bKash, Nagad, Rocket, and Bank accounts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Channel</th>
                  <th className="px-6 py-4 font-semibold">Account / Reference</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isPayoutsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-xs">
                      Loading payout history...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <History className="w-10 h-10 text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-200">No payout requests yet</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          When your balance reaches at least ৳100, you can request an instant withdrawal.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const badge = getPayoutStatusBadge(p.status);
                    const Icon = badge.icon;
                    const dateObj = new Date(p.createdAt);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                            {p.payoutMethod === "BANK_TRANSFER" ? (
                              <Building2 className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Smartphone className="w-4 h-4 text-emerald-400" />
                            )}
                            {p.payoutMethod}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-semibold text-white">
                            {p.accountDetails.accountNumber}
                          </div>
                          {p.transactionReference && (
                            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                              Gateway Ref: {p.transactionReference}
                            </div>
                          )}
                          {p.rejectionReason && (
                            <div className="text-[11px] text-rose-400 mt-0.5">
                              Reason: {p.rejectionReason}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-100">
                          ৳{Number(p.amount).toLocaleString()}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reconciliation" && <ReconciliationDesk />}

      {/* Payout Withdrawal Dialog */}
      <PayoutRequestModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        availableBalance={Number(wallet?.balance || 0)}
      />
    </div>
  );
}
