"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { type WalletTransactionItem, WalletTransactionType } from "@dhruto/contracts";
import { ArrowDownLeft, ArrowUpRight, ReceiptText, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/lib/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Button,
  type ColumnDef,
} from "@dhruto/ui";

interface TransactionsTableProps {
  transactions: WalletTransactionItem[];
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
}

function TypeBadge({ type }: { type: WalletTransactionType }) {
  switch (type) {
    case WalletTransactionType.COD_CREDIT:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-success bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {type}
        </span>
      );
    case WalletTransactionType.DELIVERY_FEE:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-danger bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          {type}
        </span>
      );
    case WalletTransactionType.PAYOUT_DEBIT:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-warning bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          {type}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
          {type}
        </span>
      );
  }
}

export function TransactionsTable({ transactions, isLoading, page, onPageChange, hasMore }: TransactionsTableProps) {
  const t = useTranslations("Finance");
  const [filterType, setFilterType] = React.useState<string>("ALL");

  const filtered = React.useMemo(() => {
    if (filterType === "ALL") return transactions;
    return transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

  const columns: ColumnDef<WalletTransactionItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => {
          const dateObj = new Date(row.original.createdAt);
          return (
            <div className="whitespace-nowrap text-caption text-muted-foreground">
              <span className="font-medium text-foreground">{dateObj.toLocaleDateString()}</span>{" "}
              <span>{dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: t("status"),
        cell: ({ row }) => <TypeBadge type={row.original.type} />,
      },
      {
        accessorKey: "description",
        header: t("description"),
        cell: ({ row }) => (
          <div>
            <p className="text-body-sm font-medium text-foreground">{row.original.description}</p>
            {row.original.referenceId && row.original.referenceType === "PARCEL" && (
              <div className="mt-0.5">
                <Link
                  href={`/track/${row.original.referenceId}`}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                >
                  <span>
                    {t("reference")}: {row.original.referenceId}
                  </span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            )}
            {row.original.referenceId && row.original.referenceType !== "PARCEL" && (
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {t("reference")}: {row.original.referenceId}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="block text-right">{t("statement.net")}</span>,
        cell: ({ row }) => (
          <div className="text-right text-body-sm font-semibold tabular-nums text-foreground">
            ৳{Number(row.original.amount).toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "balanceAfter",
        header: () => <span className="block text-right">{t("statement.balanceAfter")}</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
            ৳{Number(row.original.balanceAfter).toLocaleString()}
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="w-full space-y-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col justify-between gap-4 border-b border-border sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("statement.title")}
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              {t("subtitle")}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage={t("statement.empty")}
        filterSlot={
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: t("statement.title") },
              { id: WalletTransactionType.COD_CREDIT, label: WalletTransactionType.COD_CREDIT },
              { id: WalletTransactionType.DELIVERY_FEE, label: WalletTransactionType.DELIVERY_FEE },
              { id: WalletTransactionType.PAYOUT_DEBIT, label: WalletTransactionType.PAYOUT_DEBIT },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterType === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-surface-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="h-9 gap-1 text-xs"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {page}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasMore || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="h-9 gap-1 text-xs"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
