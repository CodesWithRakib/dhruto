"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { Search, RefreshCw, Package, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useGetRiderTasksQuery, useStartDeliveryMutation } from "../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { RiderTaskCard } from "./rider-task-card";
import { RiderPickupsCard } from "./tasks/rider-pickups-card";
import { toast } from "sonner";

type TaskFilter = "ALL" | "ASSIGNED_TO_RIDER" | "OUT_FOR_DELIVERY" | "ATTEMPTED";
type SortOption = "DEFAULT" | "AREA_CLUSTER" | "HIGH_COD" | "ATTEMPTS";

const ATTEMPTED_STATUSES = ["DELIVERY_ATTEMPTED", "RESCHEDULED"];

/** Assigned delivery tasks with route optimization, search and status filters. */
export function RiderTasksView() {
  const t = useTranslations("Rider");
  const [filter, setFilter] = React.useState<TaskFilter>("ALL");
  const [sortOption, setSortOption] = React.useState<SortOption>("AREA_CLUSTER");
  const [search, setSearch] = React.useState("");

  const { data, isLoading, isFetching, refetch } = useGetRiderTasksQuery();
  const [startDelivery, { isLoading: isStarting }] = useStartDeliveryMutation();

  const tasks = data?.data ?? [];

  const counts = React.useMemo(() => {
    return {
      ALL: tasks.length,
      ASSIGNED_TO_RIDER: tasks.filter((t) => t.status === "ASSIGNED_TO_RIDER").length,
      OUT_FOR_DELIVERY: tasks.filter((t) => t.status === "OUT_FOR_DELIVERY").length,
      ATTEMPTED: tasks.filter((t) => ATTEMPTED_STATUSES.includes(t.status)).length,
    };
  }, [tasks]);

  const filtered = tasks.filter((task) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      task.trackingCode.toLowerCase().includes(query) ||
      task.recipientName.toLowerCase().includes(query) ||
      task.deliveryAddress.toLowerCase().includes(query) ||
      (task.thana && task.thana.toLowerCase().includes(query));
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ATTEMPTED" ? ATTEMPTED_STATUSES.includes(task.status) : task.status === filter);
    return matchesSearch && matchesFilter;
  });

  const sortedTasks = React.useMemo(() => {
    const list = [...filtered];
    if (sortOption === "HIGH_COD") {
      return list.sort((a, b) => b.codAmount - a.codAmount);
    }
    if (sortOption === "ATTEMPTS") {
      return list.sort((a, b) => b.attemptCount - a.attemptCount);
    }
    if (sortOption === "AREA_CLUSTER") {
      return list.sort((a, b) => {
        if (a.status === "OUT_FOR_DELIVERY" && b.status !== "OUT_FOR_DELIVERY") return -1;
        if (b.status === "OUT_FOR_DELIVERY" && a.status !== "OUT_FOR_DELIVERY") return 1;

        const thanaA = (a.thana || "").toLowerCase();
        const thanaB = (b.thana || "").toLowerCase();
        if (thanaA !== thanaB) return thanaA.localeCompare(thanaB);

        const distA = (a.district || "").toLowerCase();
        const distB = (b.district || "").toLowerCase();
        return distA.localeCompare(distB);
      });
    }
    return list;
  }, [filtered, sortOption]);

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

  const filters: Array<{ key: TaskFilter; label: string; count: number }> = [
    { key: "ALL", label: t("tasks.filterAll"), count: counts.ALL },
    { key: "ASSIGNED_TO_RIDER", label: t("tasks.filterAssigned"), count: counts.ASSIGNED_TO_RIDER },
    { key: "OUT_FOR_DELIVERY", label: t("tasks.filterInProgress"), count: counts.OUT_FOR_DELIVERY },
    { key: "ATTEMPTED", label: t("tasks.filterAttempted"), count: counts.ATTEMPTED },
  ];

  return (
    <div className="space-y-4">
      {/* First-mile pickups assigned to this rider (hidden when none) */}
      <RiderPickupsCard />
      <div className="rounded-3xl bg-surface-elevated p-5 space-y-3.5 border border-border/40 shadow-xs">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("tasks.searchPlaceholder")}
            aria-label={t("tasks.searchPlaceholder")}
            className="h-11 rounded-2xl bg-surface-muted/60 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {filters.map((entry) => {
              const isActive = filter === entry.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <span>{entry.label}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {entry.count}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-9 w-9 shrink-0 rounded-xl bg-surface-muted/60 p-0 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label={t("refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>

        {/* Route Sorting Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Sort Runsheet:</span>
          </div>
          <div className="flex items-center rounded-xl bg-surface-muted/60 p-0.5 text-[11px] font-medium border border-border/40">
            <button
              type="button"
              onClick={() => setSortOption("AREA_CLUSTER")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                sortOption === "AREA_CLUSTER"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cluster nearby stops in same Thana together"
            >
              Area Cluster
            </button>
            <button
              type="button"
              onClick={() => setSortOption("DEFAULT")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                sortOption === "DEFAULT"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Original assignment sequence"
            >
              Sequence
            </button>
            <button
              type="button"
              onClick={() => setSortOption("HIGH_COD")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                sortOption === "HIGH_COD"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Highest COD collection first"
            >
              High COD
            </button>
            <button
              type="button"
              onClick={() => setSortOption("ATTEMPTS")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                sortOption === "ATTEMPTS"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Prioritize packages needing re-attempts"
            >
              Urgent
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
          <p>{t("loading")}</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search || filter !== "ALL" ? "No matching delivery tasks" : t("tasks.empty")}
          description={
            search || filter !== "ALL"
              ? "Try adjusting your search query or status filter to see other packages."
              : t("tasks.emptyDescription")
          }
          action={
            search || filter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("ALL");
                }}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3.5">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <RiderTaskCard task={task} onStartDelivery={handleStart} isStarting={isStarting} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
