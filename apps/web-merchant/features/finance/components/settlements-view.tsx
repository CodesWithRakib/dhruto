"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, ColumnDef, DataTable } from "@dhruto/ui";
import { type SettlementItem } from "@dhruto/contracts";
import { ReceiptText } from "lucide-react";
import { useGetMySettlementsQuery } from "../api/finance.api";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { Pagination } from "@/components/pagination";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { SETTLEMENT_STATUS_TONE } from "@/config/status";
import { useQueryState } from "@/hooks/use-query-state";
import { useFormatters } from "@/lib/format";

const PAGE_SIZE = 20;

/** Merchant parcel settlements with gross/fee/net traceability. */
export function SettlementsView() {
  const t = useTranslations("Finance");
  const tStates = useTranslations("States");
  const { bdt } = useFormatters();
  const query = useQueryState();

  // The page number lives in the URL so a settlement view survives reload,
  // the back button and a shared link.
  const page = query.getNumber("page", 1) ?? 1;
  const { data, isLoading, isError, refetch } = useGetMySettlementsQuery({
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setPage = (next: number) => query.set({ page: next }, { resetPageKeys: [] });

  const columns: ColumnDef<SettlementItem>[] = useMemo(
    () => [
      {
        id: "settlementCode",
        header: t("settlements.settlementCode"),
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-bold text-primary">
              {row.original.settlementCode}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.trackingCode}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "grossMinor",
        header: () => <div className="text-right">{t("settlements.grossCod")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono tabular-nums">
            {bdt(row.original.grossMinor / 100)}
          </div>
        ),
      },
      {
        accessorKey: "feeMinor",
        header: () => <div className="text-right">{t("settlements.deliveryFee")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono tabular-nums text-muted-foreground">
            {bdt(row.original.feeMinor / 100)}
          </div>
        ),
      },
      {
        accessorKey: "netMinor",
        header: () => <div className="text-right">{t("settlements.netPayable")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-bold tabular-nums text-success">
            {bdt(row.original.netMinor / 100)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <div className="text-center">{t("status")}</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <EnumBadge
              namespace="SettlementStatus"
              value={row.original.status}
              tones={SETTLEMENT_STATUS_TONE}
            />
          </div>
        ),
      },
    ],
    [bdt, t]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <ErrorState
              title={tStates("loadErrorTitle")}
              description={tStates("loadErrorDescription")}
              action={<RetryButton label={tStates("retry")} onRetry={() => void refetch()} />}
            />
          ) : isLoading ? (
            <LoadingState title={t("loading")} />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ReceiptText}
                title={t("settlements.empty")}
                description={t("settlements.emptyDescription")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={items}
                  totalItems={total}
                  pageCount={pageCount}
                  currentPage={page}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={isLoading && items.length === 0}
                  emptyMessage={t("settlements.empty")}
                />
              </div>

              {/* Mobile: a table would be unusable here, so records become cards. */}
              <ul className="divide-y divide-border md:hidden">
                {items.map((settlement) => (
                  <li key={settlement.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {settlement.settlementCode}
                      </span>
                      <EnumBadge
                        namespace="SettlementStatus"
                        value={settlement.status}
                        tones={SETTLEMENT_STATUS_TONE}
                      />
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {settlement.trackingCode}
                    </p>
                    <p className="text-xs tabular-nums">
                      {bdt(settlement.grossMinor / 100)} − {bdt(settlement.feeMinor / 100)} ={" "}
                      <span className="font-bold text-success">
                        {bdt(settlement.netMinor / 100)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>

              <Pagination
                className="border-t border-border px-4 py-3 md:hidden"
                page={page}
                totalPages={pageCount}
                onPageChange={setPage}
                disabled={isLoading}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
