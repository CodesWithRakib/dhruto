"use client";

import React, { useState, useMemo } from "react";
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
import {
  Button,
  DataTable,
  type ColumnDef,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@dhruto/ui";
import type { PayoutRequestItem } from "@dhruto/contracts";

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

  const payoutColumns: ColumnDef<PayoutRequestItem>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => {
          const dateObj = new Date(row.original.createdAt);
          return (
            <div className="text-caption text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">{dateObj.toLocaleDateString()}</span>{" "}
              <span>{dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "payoutMethod",
        header: "Channel",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {row.original.payoutMethod === "BANK_TRANSFER" ? (
              <Building2 className="w-4 h-4 text-primary" />
            ) : (
              <Smartphone className="w-4 h-4 text-primary" />
            )}
            {row.original.payoutMethod}
          </span>
        ),
      },
      {
        id: "account",
        header: "Account / Reference",
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-foreground">
              {row.original.accountDetails.accountNumber}
            </div>
            {row.original.transactionReference && (
              <div className="text-[11px] text-primary font-mono mt-0.5">
                Gateway Ref: {row.original.transactionReference}
              </div>
            )}
            {row.original.rejectionReason && (
              <div className="text-[11px] text-danger mt-0.5">
                Reason: {row.original.rejectionReason}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="text-right block">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-body-sm tabular-nums text-foreground">
            ৳{Number(row.original.amount).toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <span className="text-center block">Status</span>,
        cell: ({ row }) => {
          const badge = getPayoutStatusBadge(row.original.status);
          const Icon = badge.icon;
          return (
            <div className="text-center">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.bg}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{badge.label}</span>
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span>Finance & Wallet Hub</span>
            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-success-soft border border-success text-success">
              Live Settlement
            </span>
          </h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Real-time cash reconciliation, double-entry automated COD credit, and instant multi-channel payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 text-xs"
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
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-muted border border-border w-fit">
        <button
          onClick={() => setActiveTab("statement")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "statement"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Statement & Audit Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "payouts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payout History ({payouts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "reconciliation"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
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
        <div className="w-full space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Withdrawal Payout Requests
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Historical record of your withdrawal disbursement requests across bKash, Nagad, Rocket, and Bank accounts.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          <DataTable
            columns={payoutColumns}
            data={payouts}
            isLoading={isPayoutsLoading}
            emptyMessage="No payout requests yet. When your balance reaches at least ৳100, you can request an instant withdrawal."
          />
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
