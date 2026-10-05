"use client";

import React, { useState } from "react";
import { type WalletTransactionItem, WalletTransactionType } from "@dhruto/contracts";
import { ArrowDownLeft, ArrowUpRight, Filter, ReceiptText, ExternalLink } from "lucide-react";
import { Link } from "../../../lib/navigation";

interface TransactionsTableProps {
  transactions: WalletTransactionItem[];
  isLoading: boolean;
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = transactions.filter((tx) => {
    if (filterType === "ALL") return true;
    return tx.type === filterType;
  });

  const getBadgeStyle = (type: WalletTransactionType) => {
    switch (type) {
      case WalletTransactionType.COD_CREDIT:
        return {
          bg: "bg-success-soft text-success border-success",
          icon: ArrowDownLeft,
          prefix: "+",
          amountColor: "text-success font-bold",
          label: "COD Received",
        };
      case WalletTransactionType.DELIVERY_FEE:
        return {
          bg: "bg-danger-soft text-danger border-danger",
          icon: ArrowUpRight,
          prefix: "-",
          amountColor: "text-danger font-medium",
          label: "Delivery Charge",
        };
      case WalletTransactionType.PAYOUT_DEBIT:
        return {
          bg: "bg-warning-soft text-warning border-warning",
          icon: ArrowUpRight,
          prefix: "-",
          amountColor: "text-warning font-semibold",
          label: "Payout Withdrawal",
        };
      case WalletTransactionType.ADJUSTMENT_CREDIT:
        return {
          bg: "bg-info-soft text-info border-info",
          icon: ArrowDownLeft,
          prefix: "+",
          amountColor: "text-info font-semibold",
          label: "Adjustment Refund",
        };
      default:
        return {
          bg: "bg-surface-muted text-foreground border-border",
          icon: ReceiptText,
          prefix: "",
          amountColor: "text-foreground",
          label: type,
        };
    }
  };

  return (
    <div className="rounded-3xl bg-surface-muted backdrop-blur-xl border border-border overflow-hidden ">
      {/* Table Header & Filters */}
      <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-primary-foreground flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-success" />
            Wallet Statement & Audit Ledger
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Complete immutable log of all Cash on Delivery collections, delivery charges, and disbursements.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Filter:</span>
          </div>

          {[
            { id: "ALL", label: "All Records" },
            { id: WalletTransactionType.COD_CREDIT, label: "COD Credits" },
            { id: WalletTransactionType.DELIVERY_FEE, label: "Delivery Charges" },
            { id: WalletTransactionType.PAYOUT_DEBIT, label: "Withdrawals" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === tab.id
                  ? "bg-success-soft text-success border border-success "
                  : "bg-surface-muted text-muted-foreground border border-border hover:border-border hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold">Date & Time</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Description & Reference</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold text-right">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">
                  Loading ledger transactions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ReceiptText className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="font-semibold text-foreground">No transactions recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Completed parcel deliveries and payout withdrawals will appear in this ledger.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const badge = getBadgeStyle(tx.type);
                const Icon = badge.icon;
                const dateObj = new Date(tx.createdAt);

                return (
                  <tr key={tx.id} className="hover:bg-surface-muted transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      <div>{dateObj.toLocaleDateString()}</div>
                      <div className="text-[11px] text-muted-foreground">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${badge.bg}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-foreground font-medium">{tx.description}</div>
                      {tx.referenceId && (
                        <div className="mt-1">
                          <Link
                            href={`/tracking?q=${tx.referenceId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-success hover:text-success underline"
                          >
                            <span>Ref: {tx.referenceId}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </td>

                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${badge.amountColor}`}>
                      {badge.prefix}৳{Number(tx.amount).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-mono font-semibold text-foreground">
                      ৳{Number(tx.balanceAfter).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
