"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { type WalletTransactionItem, WalletTransactionType } from "@dhruto/contracts";
import { ExternalLink, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
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
import { EnumBadge } from "@/components/data-display/enum-badge";
import { WALLET_TRANSACTION_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

/** `ALL` keeps the URL readable while the API only knows concrete types. */
export const ALL_TRANSACTION_TYPES = "ALL";

interface TransactionsTableProps {
  transactions: WalletTransactionItem[];
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
  /**
   * URL-backed type filter owned by the parent, which also owns the API
   * query — this table only renders and reports the intent.
   */
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
}

const FILTERABLE_TYPES: WalletTransactionType[] = [
  WalletTransactionType.COD_CREDIT,
  WalletTransactionType.DELIVERY_FEE,
  WalletTransactionType.PAYOUT_DEBIT,
];

export function TransactionsTable({
  transactions,
  isLoading,
  page,
  onPageChange,
  hasMore,
  typeFilter,
  onTypeFilterChange,
}: TransactionsTableProps) {
  const t = useTranslations("Finance");
  const tType = useTranslations("WalletTransactionType");
  const { bdt, date, time } = useFormatters();

  const columns: ColumnDef<WalletTransactionItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-caption text-muted-foreground">
            <span className="font-medium text-foreground">{date(row.original.createdAt)}</span>{" "}
            <span>{time(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: t("status"),
        cell: ({ row }) => (
          <EnumBadge
            namespace="WalletTransactionType"
            value={row.original.type}
            tones={WALLET_TRANSACTION_TONE}
          />
        ),
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
            {bdt(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "balanceAfter",
        header: () => <span className="block text-right">{t("statement.balanceAfter")}</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
            {bdt(row.original.balanceAfter)}
          </div>
        ),
      },
    ],
    [bdt, date, time, t],
  );

  const filters = [
    { id: ALL_TRANSACTION_TYPES, label: t("statement.title") },
    ...FILTERABLE_TYPES.map((type) => ({ id: type as string, label: tType(type) })),
  ];

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
        data={transactions}
        isLoading={isLoading}
        emptyMessage={t("statement.empty")}
        filterSlot={
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t("status")}
          >
            {filters.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={typeFilter === tab.id ? "default" : "outline"}
                aria-pressed={typeFilter === tab.id}
                onClick={() => onTypeFilterChange(tab.id)}
                className="h-8 rounded-md px-3 text-xs font-semibold"
              >
                {tab.label}
              </Button>
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
