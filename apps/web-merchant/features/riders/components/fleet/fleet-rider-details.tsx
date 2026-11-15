"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Badge,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { UserCheck, History } from "lucide-react";
import { useGetFleetRiderQuery } from "../../api/riders.api";
import { useFormatters } from "@/lib/format";

export interface FleetRiderDetailsProps {
  riderId: string;
  onChanged: () => void;
}

/** Rider file: active tasks plus the assignment audit trail. */
export function FleetRiderDetails({ riderId, onChanged }: FleetRiderDetailsProps) {
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
