"use client";

import React from "react";
import { Button, ColumnDef } from "@dhruto/ui";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "@/lib/navigation";
import { EnumBadge } from "@/components/data-display/enum-badge";
import {
  CASH_HANDIN_STATUS_TONE,
  CASH_DISCREPANCY_STATUS_TONE,
  CASH_LEDGER_STATUS_TONE,
} from "@/config/status";
import type {
  PendingReconciliationItem,
  CashHandInBatchItem,
  CashDiscrepancyItem,
} from "@dhruto/contracts";

interface PendingColumnsProps {
  onOpenVerify: (item: PendingReconciliationItem) => void;
  bdt: (val: number) => string;
  statusHeader: string;
  actionsHeader: string;
  verifyCashText: string;
}

export function getPendingColumns({
  onOpenVerify,
  bdt,
  statusHeader,
  actionsHeader,
  verifyCashText,
}: PendingColumnsProps): ColumnDef<PendingReconciliationItem>[] {
  return [
    {
      accessorKey: "trackingCode",
      header: "Tracking ID",
      cell: ({ row }) => (
        <Link
          href={`/track?code=${row.original.trackingCode}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.trackingCode}
        </Link>
      ),
    },
    {
      accessorKey: "riderName",
      header: "Rider",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">{row.original.riderName}</span>
      ),
    },
    {
      accessorKey: "recipientName",
      header: "Recipient",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.recipientName}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Collected COD</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
          {bdt(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "netPayable",
      header: () => <div className="text-right">Net Payable</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-success">
          {bdt(row.original.netPayable)}
        </div>
      ),
    },
    {
      accessorKey: "handInStatus",
      header: () => <div className="text-center">{statusHeader}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <EnumBadge
            namespace="CashLedgerStatus"
            value={row.original.handInStatus}
            tones={CASH_LEDGER_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{actionsHeader}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onOpenVerify(row.original)}
            className="h-7 gap-1.5 rounded-lg text-[11px] font-semibold"
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {verifyCashText}
          </Button>
        </div>
      ),
    },
  ];
}

interface BatchesColumnsProps {
  bdt: (val: number) => string;
  statusHeader: string;
}

export function getBatchesColumns({
  bdt,
  statusHeader,
}: BatchesColumnsProps): ColumnDef<CashHandInBatchItem>[] {
  return [
    {
      accessorKey: "handinCode",
      header: "Batch Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground">{row.original.handinCode}</span>
      ),
    },
    {
      accessorKey: "riderName",
      header: "Rider",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {row.original.riderName ?? row.original.riderId}
        </span>
      ),
    },
    {
      accessorKey: "itemCount",
      header: () => <div className="text-center">Parcels</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.itemCount}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "expectedMinor",
      header: () => <div className="text-right">Expected COD</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
          {bdt(row.original.expectedMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{statusHeader}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="CashHandInStatus"
            value={row.original.status}
            tones={CASH_HANDIN_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
  ];
}

interface DiscrepanciesColumnsProps {
  bdt: (val: number) => string;
  statusHeader: string;
  expectedHeader: string;
  verifiedHeader: string;
}

export function getDiscrepanciesColumns({
  bdt,
  statusHeader,
  expectedHeader,
  verifiedHeader,
}: DiscrepanciesColumnsProps): ColumnDef<CashDiscrepancyItem>[] {
  return [
    {
      accessorKey: "type",
      header: "Discrepancy Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs font-bold text-foreground">{row.original.type}</span>
        </div>
      ),
    },
    {
      accessorKey: "expectedMinor",
      header: () => <div className="text-right">{expectedHeader}</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
          {bdt(row.original.expectedMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "actualMinor",
      header: () => <div className="text-right">{verifiedHeader}</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs tabular-nums text-foreground">
          {bdt(row.original.actualMinor / 100)}
        </div>
      ),
    },
    {
      accessorKey: "differenceMinor",
      header: () => <div className="text-right">Difference</div>,
      cell: ({ row }) => {
        const diff = row.original.differenceMinor / 100;
        return (
          <div className="text-right font-mono text-xs font-bold tabular-nums text-danger">
            {diff < 0
              ? `-৳${Math.abs(diff).toLocaleString()}`
              : diff > 0
                ? `+৳${diff.toLocaleString()}`
                : "৳0"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{statusHeader}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="CashDiscrepancyStatus"
            value={row.original.status}
            tones={CASH_DISCREPANCY_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
  ];
}
