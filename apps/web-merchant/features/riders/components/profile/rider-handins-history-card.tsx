"use client";

import * as React from "react";
import type { CashHandInBatchItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { CASH_HANDIN_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface RiderHandInsHistoryCardProps {
  handIns: CashHandInBatchItem[];
}

export function RiderHandInsHistoryCard({ handIns }: RiderHandInsHistoryCardProps) {
  const { date: fmtDate, bdt } = useFormatters();

  if (handIns.length === 0) return null;

  return (
    <div className="space-y-3 rounded-3xl bg-surface-elevated p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-border/20 pb-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recent Hand-in Batches
          </p>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
            {handIns.length} recorded
          </span>
        </div>
      </div>
      <ul className="space-y-2">
        {handIns.slice(0, 5).map((batch) => (
          <li
            key={batch.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted/30 px-4 py-3 text-xs transition-colors hover:bg-surface-muted/50"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted font-mono text-xs font-bold text-foreground">
                #
              </span>
              <div>
                <span className="font-mono font-bold text-foreground">{batch.handinCode}</span>
                <p className="text-[11px] text-muted-foreground">
                  {batch.itemCount} parcel{batch.itemCount === 1 ? "" : "s"} · {fmtDate(batch.submittedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {bdt(batch.expectedMinor / 100)}
              </span>
              <EnumBadge
                namespace="CashHandInStatus"
                value={batch.status}
                tones={CASH_HANDIN_STATUS_TONE}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
