"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Input } from "@dhruto/ui";
import { Search, RefreshCw, Package } from "lucide-react";
import { useGetRiderTasksQuery, useStartDeliveryMutation } from "../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { RiderTaskCard } from "./rider-task-card";
import { toast } from "sonner";

type TaskFilter = "ALL" | "ASSIGNED_TO_RIDER" | "OUT_FOR_DELIVERY" | "ATTEMPTED";

const ATTEMPTED_STATUSES = ["DELIVERY_ATTEMPTED", "RESCHEDULED"];

/** Assigned delivery tasks with search and status filters. */
export function RiderTasksView() {
  const t = useTranslations("Rider");
  const [filter, setFilter] = React.useState<TaskFilter>("ALL");
  const [search, setSearch] = React.useState("");

  const { data, isLoading, refetch } = useGetRiderTasksQuery();
  const [startDelivery, { isLoading: isStarting }] = useStartDeliveryMutation();

  const tasks = data?.data ?? [];
  const filtered = tasks.filter((task) => {
    const matchesSearch =
      search.trim() === "" ||
      task.trackingCode.toLowerCase().includes(search.trim().toLowerCase()) ||
      task.recipientName.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ATTEMPTED" ? ATTEMPTED_STATUSES.includes(task.status) : task.status === filter);
    return matchesSearch && matchesFilter;
  });

  const handleStart = async (parcelId: string) => {
    try {
      const res = await startDelivery(parcelId).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("details.startDelivery")));
    }
  };

  const filters: Array<{ key: TaskFilter; label: string }> = [
    { key: "ALL", label: t("tasks.filterAll") },
    { key: "ASSIGNED_TO_RIDER", label: t("tasks.filterAssigned") },
    { key: "OUT_FOR_DELIVERY", label: t("tasks.filterInProgress") },
    { key: "ATTEMPTED", label: t("tasks.filterAttempted") },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("tasks.searchPlaceholder")}
              aria-label={t("tasks.searchPlaceholder")}
              className="h-11 pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {filters.map((entry) => (
              <Button
                key={entry.key}
                size="sm"
                variant={filter === entry.key ? "default" : "outline"}
                onClick={() => setFilter(entry.key)}
                className="h-9 shrink-0 text-xs"
              >
                {entry.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="h-9 shrink-0 text-xs"
              aria-label={t("refresh")}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("tasks.empty")}
          description={t("tasks.emptyDescription")}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => (
            <li key={task.id}>
              <RiderTaskCard task={task} onStartDelivery={handleStart} isStarting={isStarting} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
