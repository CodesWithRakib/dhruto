"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Badge, Button } from "@dhruto/ui";
import { ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetMySettlementsQuery } from "../api/finance.api";
import { EmptyState } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { SETTLEMENT_STATUS_TONE } from "@/config/status";

const PAGE_SIZE = 20;

/** Merchant parcel settlements with gross/fee/net traceability. */
export function SettlementsView() {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();
  const [page, setPage] = React.useState(1);
  const { data, isLoading, refetch } = useGetMySettlementsQuery({ page, limit: PAGE_SIZE });
  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
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
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">{t("settlements.settlementCode")}</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("settlements.grossCod")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("settlements.deliveryFee")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("settlements.netPayable")}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
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
                          <Badge variant="success" className="text-[10px]">
                            {
                              <EnumBadge
                                namespace="SettlementStatus"
                                value={settlement.status}
                                tones={SETTLEMENT_STATUS_TONE}
                              />
                            }
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {items.map((settlement) => (
                  <li key={settlement.id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {settlement.settlementCode}
                      </span>
                      <Badge variant="success" className="text-[10px]">
                        {
                          <EnumBadge
                            namespace="SettlementStatus"
                            value={settlement.status}
                            tones={SETTLEMENT_STATUS_TONE}
                          />
                        }
                      </Badge>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {settlement.trackingCode}
                    </p>
                    <p className="text-xs tabular-nums">
                      {bdt(settlement.grossMinor / 100)} − ৳
                      {(settlement.feeMinor / 100).toLocaleString()} ={" "}
                      <span className="font-bold text-success">
                        {bdt(settlement.netMinor / 100)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage(page - 1);
                    refetch();
                  }}
                  className="h-9 gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {page}
                </Button>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {page} / {pageCount} · {total}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => {
                    setPage(page + 1);
                    refetch();
                  }}
                  className="h-9 gap-1 text-xs"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
