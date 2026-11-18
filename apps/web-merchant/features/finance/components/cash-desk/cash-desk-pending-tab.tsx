"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Badge, Button, DataTable, ColumnDef } from "@dhruto/ui";
import type { PendingReconciliationItem } from "@dhruto/contracts";
import { EmptyState } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";

interface CashDeskPendingTabProps {
  isLoading: boolean;
  pending: PendingReconciliationItem[];
  pendingColumns: ColumnDef<PendingReconciliationItem>[];
  onOpenVerify: (item: PendingReconciliationItem) => void;
}

export function CashDeskPendingTab({
  isLoading,
  pending,
  pendingColumns,
  onOpenVerify,
}: CashDeskPendingTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  const [pendingSearch, setPendingSearch] = React.useState("");
  const [pendingPage, setPendingPage] = React.useState(1);
  const [pendingLimit, setPendingLimit] = React.useState(10);

  const filteredPending = React.useMemo(() => {
    if (!pendingSearch.trim()) return pending;
    const q = pendingSearch.trim().toLowerCase();
    return pending.filter(
      (item) =>
        item.trackingCode.toLowerCase().includes(q) ||
        item.riderName.toLowerCase().includes(q) ||
        item.recipientName.toLowerCase().includes(q),
    );
  }, [pending, pendingSearch]);

  const pagedPending = React.useMemo(() => {
    const start = (pendingPage - 1) * pendingLimit;
    return filteredPending.slice(start, start + pendingLimit);
  }, [filteredPending, pendingPage, pendingLimit]);

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden p-4">
      {isLoading ? (
        <p role="status" className="p-8 text-center text-xs text-muted-foreground">
          {t("loading")}
        </p>
      ) : filteredPending.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={CheckCircle2}
            title={t("cash.emptyPending")}
            description={t("cash.emptyPendingDescription")}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={pendingColumns}
              data={pagedPending}
              totalItems={filteredPending.length}
              pageCount={Math.max(1, Math.ceil(filteredPending.length / pendingLimit))}
              currentPage={pendingPage}
              itemsPerPage={pendingLimit}
              onPageChange={setPendingPage}
              onLimitChange={(lim) => {
                setPendingLimit(lim);
                setPendingPage(1);
              }}
              search={pendingSearch}
              onSearchChange={(val) => {
                setPendingSearch(val);
                setPendingPage(1);
              }}
              searchPlaceholder="Search tracking ID, rider, or recipient..."
              emptyMessage={t("cash.emptyPending")}
              className="rounded-none"
            />
          </div>
          <ul className="md:hidden">
            {pagedPending.map((item) => (
              <li key={item.id} className="space-y-2 p-4 transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {item.trackingCode}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.handInStatus}
                  </Badge>
                  <span className="ml-auto font-mono text-sm font-bold tabular-nums text-foreground">
                    {bdt(item.amount)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.recipientName} · {item.riderName} · {item.hubName}
                </p>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => onOpenVerify(item)}
                    className="h-8 rounded-lg text-xs font-semibold"
                  >
                    {t("verifyCash")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
