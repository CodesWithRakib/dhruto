"use client";

import React from "react";
import { Eye, MapPin, Printer, User } from "lucide-react";
import type { ColumnDef } from "@dhruto/ui";
import { Button } from "@dhruto/ui";
import type { ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";
import { CopyButton } from "@/components/data-display/copy-button";

interface ColumnOptions {
  t: (key: string) => string;
  bdt: (val: number) => string;
  date: (val: string | Date) => string;
  time: (val: string | Date) => string;
  routes: {
    parcel: (id: string) => string;
    parcelLabel: (id: string) => string;
  };
}

export function buildParcelListColumns({
  t,
  bdt,
  date,
  time,
  routes,
}: ColumnOptions): ColumnDef<ParcelListItem>[] {
  return [
    {
      accessorKey: "trackingCode",
      header: t("tracking"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={routes.parcel(row.original.id)}
            className="font-mono text-body-sm font-semibold text-primary hover:underline"
          >
            {row.original.trackingCode}
          </Link>
          <CopyButton
            value={row.original.trackingCode}
            label={t("copyTrackingCode")}
            copiedLabel={t("trackingCopied")}
            errorLabel={t("copyFailed")}
          />
        </div>
      ),
    },
    {
      accessorKey: "recipientName",
      header: t("recipient"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{row.original.recipientName}</span>
          </p>
          <p className="mt-0.5 font-mono text-caption text-muted-foreground">
            {row.original.recipientPhone}
          </p>
        </div>
      ),
    },
    {
      id: "destination",
      header: t("address"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate font-semibold text-foreground/90">
              {row.original.thana}, {row.original.district}
            </span>
          </p>
          <p
            className="mt-0.5 max-w-[240px] truncate text-caption text-muted-foreground"
            title={row.original.deliveryAddress}
          >
            {row.original.deliveryAddress}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "codAmount",
      header: t("cod"),
      cell: ({ row }) => (
        <div>
          <p className="font-bold tabular-nums text-foreground">
            {bdt(row.original.codAmount)}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground font-medium">
            {t("fee")} {bdt(row.original.deliveryFee)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} withIcon />,
    },
    {
      accessorKey: "createdAt",
      header: t("date"),
      cell: ({ row }) => (
        <div className="text-caption text-muted-foreground">
          <span className="block whitespace-nowrap font-medium text-foreground/80">{date(row.original.createdAt)}</span>
          <span className="block whitespace-nowrap">{time(row.original.createdAt)}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">{t("actions")}</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={routes.parcelLabel(row.original.id)}
            aria-label={t("printLabel")}
            title={t("printLabel")}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("printLabel")}
              className="rounded-lg hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link
            href={routes.parcel(row.original.id)}
            aria-label={`${t("view")} ${row.original.trackingCode}`}
          >
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border/80 text-xs font-semibold hover:bg-surface-elevated">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {t("view")}
            </Button>
          </Link>
        </div>
      ),
    },
  ];
}
