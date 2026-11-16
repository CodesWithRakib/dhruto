"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { DataTable, ColumnDef } from "@dhruto/ui";
import type { CashDiscrepancyItem } from "@dhruto/contracts";
import { EmptyState } from "@/components/feedback/states";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { CASH_DISCREPANCY_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface CashDeskDiscrepanciesTabProps {
  discrepancies: CashDiscrepancyItem[];
  discrepanciesColumns: ColumnDef<CashDiscrepancyItem>[];
}

export function CashDeskDiscrepanciesTab({
  discrepancies,
  discrepanciesColumns,
}: CashDeskDiscrepanciesTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  const [discrepanciesSearch, setDiscrepanciesSearch] = React.useState("");
  const [discrepanciesPage, setDiscrepanciesPage] = React.useState(1);
  const [discrepanciesLimit, setDiscrepanciesLimit] = React.useState(10);

  const filteredDiscrepancies = React.useMemo(() => {
    if (!discrepanciesSearch.trim()) return discrepancies;
    const q = discrepanciesSearch.trim().toLowerCase();
    return discrepancies.filter((item) => item.type.toLowerCase().includes(q));
  }, [discrepancies, discrepanciesSearch]);

  const pagedDiscrepancies = React.useMemo(() => {
    const start = (discrepanciesPage - 1) * discrepanciesLimit;
    return filteredDiscrepancies.slice(start, start + discrepanciesLimit);
  }, [filteredDiscrepancies, discrepanciesPage, discrepanciesLimit]);

  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-4 shadow-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />
      {filteredDiscrepancies.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title={t("cash.emptyDiscrepancies")}
            description={t("cash.emptyDiscrepanciesDescription")}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={discrepanciesColumns}
              data={pagedDiscrepancies}
              totalItems={filteredDiscrepancies.length}
              pageCount={Math.max(1, Math.ceil(filteredDiscrepancies.length / discrepanciesLimit))}
              currentPage={discrepanciesPage}
              itemsPerPage={discrepanciesLimit}
              onPageChange={setDiscrepanciesPage}
              onLimitChange={(lim) => {
                setDiscrepanciesLimit(lim);
                setDiscrepanciesPage(1);
              }}
              search={discrepanciesSearch}
              onSearchChange={(val) => {
                setDiscrepanciesSearch(val);
                setDiscrepanciesPage(1);
              }}
              searchPlaceholder="Filter discrepancies..."
              emptyMessage={t("cash.emptyDiscrepancies")}
              className="border-0 shadow-none rounded-none"
            />
          </div>
          <div className="space-y-2 md:hidden">
            {pagedDiscrepancies.map((item) => (
              <div key={item.id} className="space-y-1.5 rounded-2xl bg-surface-muted/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs font-bold text-foreground">
                    {item.type}
                  </span>
                  <EnumBadge
                    namespace="CashDiscrepancyStatus"
                    value={item.status}
                    tones={CASH_DISCREPANCY_STATUS_TONE}
                    className="text-[10px]"
                  />
                  <span className="ml-auto font-mono text-xs font-bold tabular-nums text-danger">
                    {item.differenceMinor < 0
                      ? `-৳${Math.abs(item.differenceMinor / 100).toLocaleString()}`
                      : item.differenceMinor > 0
                        ? `+৳${(item.differenceMinor / 100).toLocaleString()}`
                        : "৳0"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.trackingCode ?? item.reason ?? "Discrepancy"} · Expected {bdt(item.expectedMinor / 100)} · Verified {bdt(item.actualMinor / 100)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
