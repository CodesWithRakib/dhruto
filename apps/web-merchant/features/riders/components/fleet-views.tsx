"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Bike } from "lucide-react";
import { type RiderListItem } from "@dhruto/contracts";
import { useGetFleetRidersQuery } from "../api/riders.api";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/page-header";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { RIDER_STATUS_TONE } from "@/config/status";
import { AssignRiderDialog } from "./fleet/assign-rider-dialog";
import { FleetRiderDetails } from "./fleet/fleet-rider-details";

export { AssignRiderDialog, FleetRiderDetails };

/** Fleet list with live task counts for hub/admin assignment workflows. */
export function FleetRidersView({ hubId }: { hubId?: string }) {
  const t = useTranslations("Rider");
  const [selectedRider, setSelectedRider] = React.useState<RiderListItem | null>(null);
  const { data, isLoading, refetch } = useGetFleetRidersQuery(hubId ? { hubId } : undefined);
  const riders = data?.data ?? [];

  const columns: ColumnDef<RiderListItem>[] = React.useMemo(() => [
    {
      id: "rider",
      header: t("profile.riderCode"),
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground">{row.original.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {row.original.riderCode}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "hubName",
      header: t("profile.hub"),
      cell: ({ row }) => <span className="text-xs">{row.original.hubName}</span>,
    },
    {
      accessorKey: "status",
      header: t("profile.status"),
      cell: ({ row }) => (
        <EnumBadge
          namespace="RiderStatus"
          value={row.original.status}
          tones={RIDER_STATUS_TONE}
        />
      ),
    },
    {
      id: "tasks",
      header: () => <div className="text-right">{t("tasks.title")}</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs tabular-nums">
          {t("fleet.activeTasks", { count: row.original.activeTaskCount })} ·{" "}
          {t("fleet.deliveredToday", { count: row.original.deliveredTodayCount })}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-xl bg-surface-muted/60 text-xs font-semibold hover:bg-surface-muted"
            onClick={() => setSelectedRider(row.original)}
          >
            {t("tasks.openDetails")}
          </Button>
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("fleet.title")} description={t("fleet.subtitle")} />
      <div className="rounded-3xl bg-surface-elevated overflow-hidden">
        <div>
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : riders.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Bike} title={t("dashboard.noTasks")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={riders}
                  totalItems={riders.length}
                  pageCount={1}
                  currentPage={1}
                  itemsPerPage={riders.length}
                  emptyMessage={t("dashboard.noTasks")}
                  className="rounded-none"
                />
              </div>
              <ul className="md:hidden">
                {riders.map((rider) => (
                  <li key={rider.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {rider.name}{" "}
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">
                          {rider.riderCode}
                        </span>
                      </p>
                      <Badge
                        variant={rider.duty === "ON_DUTY" ? "success" : "secondary"}
                        className="text-[10px] rounded-lg"
                      >
                        {rider.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rider.hubName} · {t("fleet.activeTasks", { count: rider.activeTaskCount })}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-full rounded-xl bg-surface-muted/60 text-xs font-semibold"
                      onClick={() => setSelectedRider(rider)}
                    >
                      {t("tasks.openDetails")}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={selectedRider !== null}
        onOpenChange={(open) => !open && setSelectedRider(null)}
      >
        <DialogContent className="max-w-lg rounded-3xl bg-surface-elevated p-6">
          {selectedRider ? (
            <FleetRiderDetails riderId={selectedRider.id} onChanged={() => refetch()} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
