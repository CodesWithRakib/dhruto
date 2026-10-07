"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Input } from "@dhruto/ui";
import { Search, Package, AlertTriangle, UserCheck } from "lucide-react";
import { useLazyLookupParcelQuery, useGetHubInventoryQuery } from "../api/hubs.api";
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
      <Card className="border-primary/20">
        <CardContent className="space-y-4 p-4">
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
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
                className="h-12 pl-10 font-mono text-base uppercase"
              />
            </div>
            <Button
              type="submit"
              disabled={isLookingUp || !trackingCode.trim()}
              className="h-12 px-6"
            >
              {isLookingUp ? t("lookup.searching") : t("lookup.search")}
            </Button>
          </form>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-danger bg-danger-soft p-4 text-danger"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{t("lookup.notFound")}</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          ) : null}

          {parcel ? (
            <div
              role="status"
              className="space-y-3 rounded-xl border border-border bg-surface-muted p-4"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("lookup.searchLabel")}
                  </p>
                  <p className="font-mono text-sm font-bold">{parcel.trackingCode}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("lookup.currentStatus")}
                  </p>
                  <StatusBadge status={parcel.status} className="mt-1" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("lookup.recipient")}
                  </p>
                  <p className="text-sm font-semibold">{parcel.recipientName}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("lookup.destination")}
                  </p>
                  <p className="text-sm">
                    {[parcel.district, parcel.thana].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("lookup.weight")}
                  </p>
                  <p className="font-mono text-sm tabular-nums">{parcel.weightKg} kg</p>
                </div>
              </div>
              {ASSIGNABLE_STATUSES.includes(parcel.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignOpen(true)}
                  className="h-11 w-full gap-1.5 sm:w-auto"
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("inventoryTab")} ({inventory?.parcels.length ?? 0})
          </h2>
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
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">{t("lookup.searchLabel")}</th>
                      <th className="px-4 py-3 font-semibold">{t("lookup.recipient")}</th>
                      <th className="px-4 py-3 font-semibold">{t("lookup.destination")}</th>
                      <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventory.parcels.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold">
                          {item.trackingCode}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{item.recipientName}</td>
                        <td className="px-4 py-2.5 text-xs">{item.district ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={item.status} className="text-[10px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {inventory.parcels.map((item) => (
                  <li key={item.id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold">{item.trackingCode}</span>
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
        </CardContent>
      </Card>
    </div>
  );
}
