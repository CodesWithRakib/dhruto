"use client";

import React, { useState, useMemo } from "react";
import { type WalletTransactionItem, WalletTransactionType } from "@dhruto/contracts";
import { ArrowDownLeft, ArrowUpRight, ReceiptText, ExternalLink } from "lucide-react";
import { Link } from "../../../lib/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  type ColumnDef,
} from "@dhruto/ui";

interface TransactionsTableProps {
  transactions: WalletTransactionItem[];
  isLoading: boolean;
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (filterType === "ALL") return transactions;
    return transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

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

  const columns: ColumnDef<WalletTransactionItem>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date & Time",
        cell: ({ row }) => {
          const dateObj = new Date(row.original.createdAt);
          return (
            <div className="text-caption text-muted-foreground">
              <span className="font-medium text-foreground">{dateObj.toLocaleDateString()}</span>
              <br />
              <span>{dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const badge = getBadgeStyle(row.original.type);
          const Icon = badge.icon;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.bg}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {badge.label}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description & Reference",
        cell: ({ row }) => (
          <div>
            <p className="text-body-sm text-foreground font-medium">{row.original.description}</p>
            {row.original.referenceId && (
              <div className="mt-0.5">
                <Link
                  href={`/tracking?q=${row.original.referenceId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
                >
                  <span>Ref: {row.original.referenceId}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="text-right block">Amount</span>,
        cell: ({ row }) => {
          const badge = getBadgeStyle(row.original.type);
          return (
            <div className={`text-right tabular-nums text-body-sm ${badge.amountColor}`}>
              {badge.prefix}৳{Number(row.original.amount).toLocaleString()}
            </div>
          );
        },
      },
      {
        accessorKey: "balanceAfter",
        header: () => <span className="text-right block">Balance After</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold tabular-nums text-xs text-foreground">
            ৳{Number(row.original.balanceAfter).toLocaleString()}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="w-full space-y-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-primary" />
              Wallet Statement & Audit Ledger
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Complete immutable log of all Cash on Delivery collections, delivery charges, and disbursements.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No transactions recorded yet. Completed parcel deliveries and payout withdrawals will appear in this ledger."
        filterSlot={
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "ALL", label: "All Records" },
              { id: WalletTransactionType.COD_CREDIT, label: "COD Credits" },
              { id: WalletTransactionType.DELIVERY_FEE, label: "Delivery Charges" },
              { id: WalletTransactionType.PAYOUT_DEBIT, label: "Withdrawals" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterType === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface-muted text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
