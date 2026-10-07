"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Bike, UserCheck, History } from "lucide-react";
import { type RiderListItem } from "@dhruto/contracts";
import {
  useGetFleetRidersQuery,
  useGetFleetRiderQuery,
  useAssignParcelToRiderMutation,
} from "../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { RIDER_STATUS_TONE } from "@/config/status";

interface AssignRiderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelId: string;
  trackingCode: string;
  hubId?: string;
  onAssigned: () => void;
}

/**
 * Controlled rider assignment: eligible riders with live task counts, one
 * explicit confirmation. The backend re-validates eligibility, hub match and
 * reassignment rules — the UI never decides authorization.
 */
export function AssignRiderDialog({
  open,
  onOpenChange,
  parcelId,
  trackingCode,
  hubId,
  onAssigned,
}: AssignRiderDialogProps) {
  const t = useTranslations("Rider");
  const [riderId, setRiderId] = React.useState("");
  const { data } = useGetFleetRidersQuery(hubId ? { hubId } : undefined, { skip: !open });
  const [assign, { isLoading }] = useAssignParcelToRiderMutation();

  const riders = (data?.data ?? []).filter(
    (rider) => rider.status === "ACTIVE" || rider.status === "ON_DUTY",
  );

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!riderId) {
      toast.error(t("fleet.selectRiderRequired"));
      return;
    }
    try {
      const res = await assign({ parcelId, riderId }).unwrap();
      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        setRiderId("");
        onAssigned();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("fleet.assignRider")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("fleet.assignRider")}</DialogTitle>
          <DialogDescription className="font-mono">{trackingCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="assign-rider" className="text-xs font-semibold text-muted-foreground">
              {t("fleet.selectRider")} *
            </label>
            <Select
              value={riderId}
              onValueChange={setRiderId}
              required
            >
              <SelectTrigger id="assign-rider" className="w-full">
                <SelectValue placeholder={t("fleet.selectRider")} />
              </SelectTrigger>
              <SelectContent>
                {riders.map((rider) => (
                  <SelectItem key={rider.id} value={rider.id}>
                    {rider.name} ({rider.riderCode}) ·{" "}
                    {t("fleet.activeTasks", { count: rider.activeTaskCount })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !riderId}>
              {isLoading ? t("fleet.assigning") : t("fleet.confirmAssign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
            variant="outline"
            className="h-8 text-xs"
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
      <Card>
        <CardContent className="p-0">
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
                />
              </div>
              <ul className="divide-y divide-border md:hidden">
                {riders.map((rider) => (
                  <li key={rider.id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {rider.name}{" "}
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">
                          {rider.riderCode}
                        </span>
                      </p>
                      <Badge
                        variant={rider.duty === "ON_DUTY" ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {rider.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rider.hubName} · {t("fleet.activeTasks", { count: rider.activeTaskCount })}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full"
                      onClick={() => setSelectedRider(rider)}
                    >
                      {t("tasks.openDetails")}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedRider !== null}
        onOpenChange={(open) => !open && setSelectedRider(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedRider ? (
            <FleetRiderDetails riderId={selectedRider.id} onChanged={() => refetch()} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Rider file: active tasks plus the assignment audit trail. */
export function FleetRiderDetails({
  riderId,
  onChanged,
}: {
  riderId: string;
  onChanged: () => void;
}) {
  const t = useTranslations("Rider");
  const { date: fmtDate } = useFormatters();
  const { data, isLoading, refetch } = useGetFleetRiderQuery(riderId);
  const rider = data?.data;

  if (isLoading || !rider) {
    return (
      <p role="status" className="p-8 text-center text-xs text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          {rider.name}{" "}
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {rider.riderCode}
          </span>
        </DialogTitle>
        <DialogDescription>
          {rider.hubName} · {rider.status}
        </DialogDescription>
      </DialogHeader>
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("tasks.title")} ({rider.activeTasks.length})
        </h3>
        {rider.activeTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("tasks.empty")}</p>
        ) : (
          <ul className="space-y-1.5">
            {rider.activeTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs"
              >
                <span className="font-mono font-semibold">{task.trackingCode}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {task.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          {t("fleet.assignmentsTitle")} ({rider.assignments.length})
        </h3>
        {rider.assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("fleet.noAssignments")}</p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {rider.assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 font-mono text-[11px]"
              >
                <span className="font-semibold">{assignment.trackingCode}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {fmtDate(assignment.assignedAt)}
                  {assignment.unassignedAt ? ` · ${t("fleet.reassignedNote")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            refetch();
            onChanged();
          }}
        >
          {t("refresh")}
        </Button>
      </DialogFooter>
    </div>
  );
}
