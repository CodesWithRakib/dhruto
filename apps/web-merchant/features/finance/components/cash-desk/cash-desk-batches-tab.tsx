"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Coins } from "lucide-react";
import { DataTable, ColumnDef } from "@dhruto/ui";
import type { CashHandInBatchItem } from "@dhruto/contracts";
import { EmptyState } from "@/components/feedback/states";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { CASH_HANDIN_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface CashDeskBatchesTabProps {
  batches: CashHandInBatchItem[];
  batchesColumns: ColumnDef<CashHandInBatchItem>[];
}

export function CashDeskBatchesTab({ batches, batchesColumns }: CashDeskBatchesTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  const [batchesSearch, setBatchesSearch] = React.useState("");
  const [batchesPage, setBatchesPage] = React.useState(1);
  const [batchesLimit, setBatchesLimit] = React.useState(10);

  const filteredBatches = React.useMemo(() => {
    if (!batchesSearch.trim()) return batches;
    const q = batchesSearch.trim().toLowerCase();
    return batches.filter(
      (item) =>
        item.handinCode.toLowerCase().includes(q) ||
        (item.riderName?.toLowerCase().includes(q) ?? false),
    );
  }, [batches, batchesSearch]);

  const pagedBatches = React.useMemo(() => {
    const start = (batchesPage - 1) * batchesLimit;
    return filteredBatches.slice(start, start + batchesLimit);
  }, [filteredBatches, batchesPage, batchesLimit]);

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden p-4">
      {filteredBatches.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={Coins} title={t("cash.emptyBatches")} />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={batchesColumns}
              data={pagedBatches}
              totalItems={filteredBatches.length}
              pageCount={Math.max(1, Math.ceil(filteredBatches.length / batchesLimit))}
              currentPage={batchesPage}
              itemsPerPage={batchesLimit}
              onPageChange={setBatchesPage}
              onLimitChange={(lim) => {
                setBatchesLimit(lim);
                setBatchesPage(1);
              }}
              search={batchesSearch}
              onSearchChange={(val) => {
                setBatchesSearch(val);
                setBatchesPage(1);
              }}
              searchPlaceholder="Search batch code or rider..."
              emptyMessage={t("cash.emptyBatches")}
              className="rounded-none"
            />
          </div>
          <div className="space-y-2 md:hidden">
            {pagedBatches.map((batch) => (
              <div key={batch.id} className="space-y-1.5 rounded-2xl bg-surface-muted/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {batch.handinCode}
                  </span>
                  <EnumBadge
                    namespace="CashHandInStatus"
                    value={batch.status}
                    tones={CASH_HANDIN_STATUS_TONE}
                    className="text-[10px]"
                  />
                  <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-foreground">
                    {bdt(batch.expectedMinor / 100)} · {batch.itemCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {batch.riderName ?? batch.riderId} · {batch.hubName ?? ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
