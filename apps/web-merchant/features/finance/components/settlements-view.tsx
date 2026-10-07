"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@dhruto/ui";
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
              {/* Data-heavy table: horizontal scroll container on tablet and up. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t("settlements.settlementCode")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">
                        {t("settlements.grossCod")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">
                        {t("settlements.deliveryFee")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">
                        {t("settlements.netPayable")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-center font-semibold">
                        {t("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((settlement) => (
                      <tr key={settlement.id}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-primary">
                            {settlement.settlementCode}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {settlement.trackingCode}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {bdt(settlement.grossMinor / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                          {bdt(settlement.feeMinor / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-success">
                          {bdt(settlement.netMinor / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <EnumBadge
                            namespace="SettlementStatus"
                            value={settlement.status}
                            tones={SETTLEMENT_STATUS_TONE}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                className="border-t border-border px-4 py-3"
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
