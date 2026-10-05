"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParcelsList } from "../hooks/use-parcels-list";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  DataTable,
  type ColumnDef,
} from "@dhruto/ui";
import { PackageSearch, Plus, MapPin, Phone, Hash, Printer, Eye } from "lucide-react";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { ParcelCreatedResponse } from "@dhruto/contracts";

const STATUS_FILTERS = [
  { value: "", labelKey: "all" },
  { value: "CREATED", labelKey: "filterCreated" },
  { value: "IN_TRANSIT", labelKey: "filterInTransit" },
  { value: "OUT_FOR_DELIVERY", labelKey: "filterOutForDelivery" },
  { value: "DELIVERED", labelKey: "filterDelivered" },
  { value: "RETURNED_TO_MERCHANT", labelKey: "filterReturned" },
] as const;

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const routes = useRouteBase();
  const { parcels, isLoading, isError, refetch, status, setStatus, search, setSearch } = useParcelsList();

  const createHref = routes.createBooking;

  const columns: ColumnDef<ParcelCreatedResponse>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: t("tracking"),
        cell: ({ row }) => (
          <Link
            href={routes.parcel(row.original.id)}
            className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {row.original.trackingCode}
          </Link>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("recipient"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.recipientName}</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-caption text-muted-foreground">
              <Phone className="h-3 w-3" aria-hidden="true" />
              {row.original.recipientPhone}
            </p>
          </div>
        ),
      },
      {
        id: "destination",
        header: t("address"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.thana}, {row.original.district}
            </p>
            <p className="mt-0.5 flex items-start gap-1 text-caption text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="max-w-[220px] truncate" title={row.original.deliveryAddress}>
                {row.original.deliveryAddress}
              </span>
            </p>
          </div>
        ),
      },
      {
        accessorKey: "codAmount",
        header: t("cod"),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              ৳{row.original.codAmount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {t("fee")} ৳{row.original.deliveryFee}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <div className="text-caption text-muted-foreground">
              <span>{d.toLocaleDateString()}</span>
              <br />
              <span>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-right block">{t("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={routes.parcelLabel(row.original.id)}
              aria-label={t("printLabel")}
              title={t("printLabel")}
            >
              <Button variant="ghost" size="icon-sm">
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href={routes.parcel(row.original.id)}>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {t("view")}
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [t, routes],
  );

  return (
    <div className="w-full space-y-4">
      <Card className="w-full border-border shadow-sm">
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-h3 text-foreground">
              <PackageSearch className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              {t("description")}
            </CardDescription>
          </div>
          {createHref ? (
            <Link href={createHref}>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("create")}
              </Button>
            </Link>
          ) : null}
        </CardHeader>
      </Card>

      <DataTable
        columns={columns}
        data={parcels}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("searchPlaceholder")}
        filterSlot={
          <div className="flex items-center gap-2">
            <label
              htmlFor="parcel-status-filter"
              className="text-caption font-medium text-muted-foreground whitespace-nowrap"
            >
              {t("status")}:
            </label>
            <select
              id="parcel-status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        }
        emptyMessage={t("empty")}
      />
    </div>
  );
}
