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
          bg: "bg-success-soft text-success border-success",
          icon: CheckCircle2,
          label: "Disbursed",
        };
      case "REQUESTED":
      case "PROCESSING":
        return {
          bg: "bg-warning-soft text-warning border-warning",
          icon: Clock,
          label: "Under Review",
        };
      case "REJECTED":
        return {
          bg: "bg-danger-soft text-danger border-danger",
          icon: XCircle,
          label: "Rejected & Refunded",
        };
      default:
        return {
          bg: "bg-surface-muted text-muted-foreground border-border",
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
          <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground flex items-center gap-3">
            <span>Finance & Wallet Hub</span>
            <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-success-soft border border-success text-success">
              Live Settlement
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time cash reconciliation, double-entry automated COD credit, and instant multi-channel payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="rounded-2xl border-border text-foreground hover:bg-surface-muted flex items-center gap-2 text-xs"
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
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-muted border border-border backdrop-blur-xl w-fit">
        <button
          onClick={() => setActiveTab("statement")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "statement"
              ? "bg-success text-primary-foreground  shadow-emerald-950/30"
              : "text-muted-foreground hover:text-primary-foreground"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Statement & Audit Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "payouts"
              ? "bg-success text-primary-foreground  shadow-emerald-950/30"
              : "text-muted-foreground hover:text-primary-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payout History ({payouts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "reconciliation"
              ? "bg-success text-primary-foreground  shadow-emerald-950/30"
              : "text-muted-foreground hover:text-primary-foreground"
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
        <div className="rounded-3xl bg-surface-muted backdrop-blur-xl border border-border overflow-hidden ">
          <div className="p-6 border-b border-border">
            <h4 className="text-lg font-bold text-primary-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-success" />
              Withdrawal Payout Requests
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Historical record of your withdrawal disbursement requests across bKash, Nagad, Rocket, and Bank accounts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Channel</th>
                  <th className="px-6 py-4 font-semibold">Account / Reference</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isPayoutsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">
                      Loading payout history...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <History className="w-10 h-10 text-muted-foreground mb-2" />
                        <p className="font-semibold text-foreground">No payout requests yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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
                      <tr key={p.id} className="hover:bg-surface-muted transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                            {p.payoutMethod === "BANK_TRANSFER" ? (
                              <Building2 className="w-4 h-4 text-primary" />
                            ) : (
                              <Smartphone className="w-4 h-4 text-success" />
                            )}
                            {p.payoutMethod}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-semibold text-primary-foreground">
                            {p.accountDetails.accountNumber}
                          </div>
                          {p.transactionReference && (
                            <div className="text-[11px] text-success font-mono mt-0.5">
                              Gateway Ref: {p.transactionReference}
                            </div>
                          )}
                          {p.rejectionReason && (
                            <div className="text-[11px] text-danger mt-0.5">
                              Reason: {p.rejectionReason}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-foreground">
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
