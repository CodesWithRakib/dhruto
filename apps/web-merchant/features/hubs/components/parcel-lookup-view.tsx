"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input, DataTable, ColumnDef } from "@dhruto/ui";
import { Search, Package, AlertTriangle, UserCheck } from "lucide-react";
import { useLazyLookupParcelQuery, useGetHubInventoryQuery } from "../api/hubs.api";
import type { HubInventory } from "@dhruto/contracts";
import { AssignRiderDialog } from "@/features/riders/components/fleet-views";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { StatusBadge } from "@/components/data-display/status-badge";

/** Parcel states that may be handed to a rider from this hub. */
const ASSIGNABLE_STATUSES = [
  "DESTINATION_HUB_RECEIVED",
  "ASSIGNED_TO_RIDER",
  "DELIVERY_ATTEMPTED",
  "RESCHEDULED",
];

interface ParcelLookupViewProps {
  currentHubId: string;
}

/**
 * Parcel lookup by tracking code plus the live inventory of parcels
 * physically at this hub. Only operational fields are shown — the backend
 * never returns merchant pricing or contact data here.
 */
export function ParcelLookupView({ currentHubId }: ParcelLookupViewProps) {
  const t = useTranslations("Hub");
  const [trackingCode, setTrackingCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const [triggerLookup, { data: lookupData, isFetching: isLookingUp }] = useLazyLookupParcelQuery();
  const { data: inventoryData, isLoading: inventoryLoading } =
    useGetHubInventoryQuery(currentHubId);

  const parcel = lookupData?.data;
  const inventory = inventoryData?.data;

  const columns: ColumnDef<HubInventory["parcels"][number]>[] = React.useMemo(() => [
    {
      accessorKey: "trackingCode",
      header: t("lookup.searchLabel"),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.trackingCode}</span>
      ),
    },
    {
      accessorKey: "recipientName",
      header: t("lookup.recipient"),
      cell: ({ row }) => <span className="text-xs">{row.original.recipientName}</span>,
    },
    {
      accessorKey: "district",
      header: t("lookup.destination"),
      cell: ({ row }) => <span className="text-xs">{row.original.district ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status} className="text-[10px]" />
        </div>
      ),
    },
  ], [t]);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = trackingCode.trim();
    if (!code) return;
    setError(null);
    try {
      await triggerLookup({ hubId: currentHubId, trackingCode: code }).unwrap();
    } catch (err) {
      setError(getApiErrorMessage(err, t("lookup.notFound")));
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 sm:p-6 space-y-5 shadow-sm">
        {/* Specular top highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              placeholder={t("lookup.searchPlaceholder")}
              aria-label={t("lookup.searchLabel")}
              className="h-12 rounded-2xl border border-border/50 bg-surface-muted/60 pl-11 font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground focus:bg-background"
            />
          </div>
          <Button
            type="submit"
            disabled={isLookingUp || !trackingCode.trim()}
            className="h-12 rounded-2xl px-7 font-semibold shadow-xs"
          >
            {isLookingUp ? t("lookup.searching") : t("lookup.search")}
          </Button>
        </form>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-danger shadow-xs"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{t("lookup.notFound")}</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : null}

        {parcel ? (
          <div
            role="status"
            className="relative space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-2xs"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("lookup.searchLabel")}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">{parcel.trackingCode}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("lookup.currentStatus")}
                </p>
                <div className="mt-1">
                  <StatusBadge status={parcel.status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("lookup.recipient")}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{parcel.recipientName}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("lookup.destination")}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {[parcel.district, parcel.thana].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("lookup.weight")}
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">{parcel.weightKg} kg</p>
              </div>
            </div>
            {ASSIGNABLE_STATUSES.includes(parcel.status) ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAssignOpen(true)}
                className="h-10 w-full gap-2 rounded-xl bg-surface-elevated sm:w-auto font-medium hover:bg-surface-muted shadow-2xs"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {t("assignRider")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {parcel ? (
          <AssignRiderDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            parcelId={parcel.id}
            trackingCode={parcel.trackingCode}
            hubId={currentHubId}
            onAssigned={() => setTrackingCode("")}
          />
        ) : null}
      </div>

      <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden shadow-sm">
        {/* Specular top highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              {t("inventoryTab")}
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {inventory?.parcels.length ?? 0}
            </span>
          </div>
        </div>
        <div>
          {inventoryLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : !inventory || inventory.parcels.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Package} title={t("dashboard.noRecentScans")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={inventory.parcels}
                  totalItems={inventory.parcels.length}
                  pageCount={1}
                  currentPage={1}
                  itemsPerPage={inventory.parcels.length}
                  emptyMessage={t("dashboard.noRecentScans")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <ul className="divide-y divide-border/20 md:hidden">
                {inventory.parcels.map((item) => (
                  <li key={item.id} className="space-y-1.5 p-4 transition-colors hover:bg-surface-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{item.trackingCode}</span>
                      <StatusBadge status={item.status} className="text-[10px]" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.recipientName} · {item.district ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
