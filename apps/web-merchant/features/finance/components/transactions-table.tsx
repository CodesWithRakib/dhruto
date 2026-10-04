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
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: ArrowDownLeft,
          prefix: "+",
          amountColor: "text-emerald-400 font-bold",
          label: "COD Received",
        };
      case WalletTransactionType.DELIVERY_FEE:
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: ArrowUpRight,
          prefix: "-",
          amountColor: "text-rose-400 font-medium",
          label: "Delivery Charge",
        };
      case WalletTransactionType.PAYOUT_DEBIT:
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: ArrowUpRight,
          prefix: "-",
          amountColor: "text-amber-400 font-semibold",
          label: "Payout Withdrawal",
        };
      case WalletTransactionType.ADJUSTMENT_CREDIT:
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: ArrowDownLeft,
          prefix: "+",
          amountColor: "text-blue-400 font-semibold",
          label: "Adjustment Refund",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          icon: ReceiptText,
          prefix: "",
          amountColor: "text-slate-300",
          label: type,
        };
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Table Header & Filters */}
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-emerald-400" />
            Wallet Statement & Audit Ledger
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Complete immutable log of all Cash on Delivery collections, delivery charges, and disbursements.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
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
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-slate-950/40 text-slate-400 border border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-semibold">Date & Time</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Description & Reference</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold text-right">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-xs">
                  Loading ledger transactions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ReceiptText className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">No transactions recorded yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">
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
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div>{dateObj.toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-500">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${badge.bg}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-200 font-medium">{tx.description}</div>
                      {tx.referenceId && (
                        <div className="mt-1">
                          <Link
                            href={`/tracking?q=${tx.referenceId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 hover:text-emerald-300 underline"
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

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-mono font-semibold text-slate-300">
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
