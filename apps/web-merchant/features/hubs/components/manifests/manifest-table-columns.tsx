"use client";

import React from "react";
import { ColumnDef, Button } from "@dhruto/ui";
import { ArrowRight, FileText, Send } from "lucide-react";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { MANIFEST_STATUS_TONE } from "@/config/status";
import { ManifestStatus, type ManifestListItem } from "@dhruto/contracts";

interface GetManifestColumnsProps {
  onDispatch: (manifestId: string) => void;
  isDispatching: boolean;
  vehicleHeader: string;
  bagsHeader: string;
  statusHeader: string;
  actionsHeader: string;
  dispatchText: string;
  detailsText: string;
}

export function getManifestColumns({
  onDispatch,
  isDispatching,
  vehicleHeader,
  bagsHeader,
  statusHeader,
  actionsHeader,
  dispatchText,
  detailsText,
}: GetManifestColumnsProps): ColumnDef<ManifestListItem>[] {
  return [
    {
      accessorKey: "manifestCode",
      header: "Manifest",
      cell: ({ row }) => (
        <Link
          href={HUB_ROUTES.manifest(row.original.id)}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.original.manifestCode}
        </Link>
      ),
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-medium">{row.original.originHubName}</span>
          <ArrowRight
            className="mx-1 inline h-3 w-3 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium text-primary">
            {row.original.destinationHubName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vehicleNumber",
      header: vehicleHeader,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.vehicleNumber}</span>
      ),
    },
    {
      accessorKey: "bagCount",
      header: () => <div className="text-center">{bagsHeader}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.bagCount}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{statusHeader}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="ManifestStatus"
            value={row.original.status}
            tones={MANIFEST_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{actionsHeader}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {row.original.status === ManifestStatus.CREATED ? (
            <Button
              size="sm"
              onClick={() => onDispatch(row.original.id)}
              disabled={isDispatching}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {dispatchText}
            </Button>
          ) : null}
          <Link href={HUB_ROUTES.manifest(row.original.id)}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 rounded-xl text-xs bg-surface-muted/60 font-semibold hover:bg-surface-muted"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {detailsText}
            </Button>
          </Link>
        </div>
      ),
    },
  ];
}
