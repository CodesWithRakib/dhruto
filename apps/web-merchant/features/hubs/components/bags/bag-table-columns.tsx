"use client";

import React from "react";
import { ColumnDef, Button } from "@dhruto/ui";
import { Lock } from "lucide-react";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";
import { BagStatus, type BagListItem } from "@dhruto/contracts";

interface GetBagColumnsProps {
  onOpenSeal: (bagId: string) => void;
  statusHeader: string;
  parcelsHeader: string;
  actionsHeader: string;
  destinationHeader: string;
  sealText: string;
  detailsText: string;
}

export function getBagColumns({
  onOpenSeal,
  statusHeader,
  parcelsHeader,
  actionsHeader,
  destinationHeader,
  sealText,
  detailsText,
}: GetBagColumnsProps): ColumnDef<BagListItem>[] {
  return [
    {
      accessorKey: "bagCode",
      header: "Bag",
      cell: ({ row }) => (
        <div>
          <Link
            href={HUB_ROUTES.bag(row.original.id)}
            className="font-mono font-bold text-primary hover:underline"
          >
            {row.original.bagCode}
          </Link>
          {row.original.sealTag ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.sealTag}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "destinationHubName",
      header: destinationHeader,
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.destinationHubName}</span>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{statusHeader}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="BagStatus"
            value={row.original.status}
            tones={BAG_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
    {
      accessorKey: "parcelCount",
      header: () => <div className="text-center">{parcelsHeader}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.parcelCount}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{actionsHeader}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.original.status === BagStatus.OPEN ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenSeal(row.original.id)}
              className="h-8 gap-1 rounded-xl bg-surface-muted/60 text-xs font-medium hover:bg-surface-muted"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              {sealText}
            </Button>
          ) : null}
          <Link href={HUB_ROUTES.bag(row.original.id)}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl bg-surface-muted/60 text-xs font-medium hover:bg-surface-muted"
            >
              {detailsText}
            </Button>
          </Link>
        </div>
      ),
    },
  ];
}
