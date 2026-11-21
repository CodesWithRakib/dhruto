"use client";

import * as React from "react";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Navigation,
  Phone,
  Truck,
} from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";
import type { RiderTaskItem } from "@dhruto/contracts";

interface RiderRunsheetQueueProps {
  tasks: RiderTaskItem[];
}

type SortStrategy = "CLUSTER" | "SEQUENCE" | "HIGH_COD";

export function RiderRunsheetQueue({ tasks }: RiderRunsheetQueueProps) {
  const { bdt } = useFormatters();
  const [sortStrategy, setSortStrategy] = React.useState<SortStrategy>("CLUSTER");

  // Active / pending stops: out for delivery first, then assigned
  const activeStops = React.useMemo(() => {
    const pending = tasks.filter(
      (task) => task.status === "OUT_FOR_DELIVERY" || task.status === "ASSIGNED_TO_RIDER",
    );

    if (sortStrategy === "HIGH_COD") {
      return [...pending].sort((a, b) => b.codAmount - a.codAmount);
    }

    if (sortStrategy === "CLUSTER") {
      // Prioritize OUT_FOR_DELIVERY at top, then cluster by Thana, then District
      return [...pending].sort((a, b) => {
        if (a.status === "OUT_FOR_DELIVERY" && b.status !== "OUT_FOR_DELIVERY") return -1;
        if (b.status === "OUT_FOR_DELIVERY" && a.status !== "OUT_FOR_DELIVERY") return 1;

        const thanaA = (a.thana || "").toLowerCase();
        const thanaB = (b.thana || "").toLowerCase();
        if (thanaA !== thanaB) {
          return thanaA.localeCompare(thanaB);
        }

        const distA = (a.district || "").toLowerCase();
        const distB = (b.district || "").toLowerCase();
        return distA.localeCompare(distB);
      });
    }

    // Default sequential
    return pending;
  }, [tasks, sortStrategy]);

  if (activeStops.length === 0) {
    return null;
  }

  return (
    <section aria-label="Today's Active Runsheet Stops" className="space-y-3">
      {/* Header with Sort Mode & Link */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-extrabold tracking-tight text-foreground">
            Today's Delivery Stops Queue
          </h2>
          <Badge variant="primary-soft" className="text-[10px] font-bold">
            {activeStops.length} Remaining
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Route Sorting Strategy */}
          <div className="flex items-center rounded-xl bg-surface-muted/70 p-0.5 text-[11px] font-medium border border-border/40">
            <button
              type="button"
              onClick={() => setSortStrategy("CLUSTER")}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                sortStrategy === "CLUSTER"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cluster nearby stops in same Thana together"
            >
              Area Cluster
            </button>
            <button
              type="button"
              onClick={() => setSortStrategy("SEQUENCE")}
              className={`rounded-lg px-2 py-1 transition-all ${
                sortStrategy === "SEQUENCE"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Original assignment sequence"
            >
              Sequence
            </button>
            <button
              type="button"
              onClick={() => setSortStrategy("HIGH_COD")}
              className={`rounded-lg px-2 py-1 transition-all ${
                sortStrategy === "HIGH_COD"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Highest COD collection first"
            >
              High COD
            </button>
          </div>

          <Link
            href={RIDER_ROUTES.tasks}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>All Tasks</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Runsheet List */}
      <div className="divide-y divide-border/40 rounded-2xl bg-card border border-border/40 overflow-hidden shadow-xs">
        {activeStops.slice(0, 6).map((task, index) => {
          const isOutForDelivery = task.status === "OUT_FOR_DELIVERY";
          const destinationQuery = `${task.deliveryAddress}, ${task.thana || ""}, ${task.district || ""}, Bangladesh`;
          const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationQuery)}`;

          return (
            <div
              key={task.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-surface-muted/50 ${
                isOutForDelivery ? "bg-warning/5" : ""
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    isOutForDelivery
                      ? "bg-warning text-warning-foreground font-black"
                      : "bg-surface-muted text-foreground/80 font-bold"
                  }`}
                >
                  #{index + 1}
                </span>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {task.trackingCode}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isOutForDelivery
                          ? "bg-warning/20 text-warning-foreground font-black"
                          : "bg-info/15 text-info font-bold"
                      }`}
                    >
                      {isOutForDelivery ? "Current In-Transit" : "Assigned"}
                    </span>
                    {task.thana && (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        📍 {task.thana}
                      </span>
                    )}
                    {task.codAmount > 0 && (
                      <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-bold font-mono text-foreground">
                        COD: <span className="text-primary">{bdt(task.codAmount)}</span>
                      </span>
                    )}
                  </div>

                  <p className="truncate text-xs font-semibold text-foreground">
                    {task.recipientName}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">
                      {task.deliveryAddress}
                      {[task.thana, task.district].filter(Boolean).length > 0
                        ? ` · ${[task.thana, task.district].filter(Boolean).join(", ")}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Directions, Call, Deliver */}
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {/* 1-Tap Google Maps Turn-by-Turn Navigation */}
                <a
                  href={navUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-info/10 px-3 text-xs font-bold text-info hover:bg-info/20 transition-colors"
                  title="Open GPS Navigation in Google Maps"
                >
                  <Navigation className="h-3.5 w-3.5 fill-current" />
                  <span>Navigate</span>
                </a>

                {task.recipientPhone && (
                  <a
                    href={`tel:${task.recipientPhone}`}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-surface-muted px-3 text-xs font-bold text-foreground hover:bg-surface-muted/80 transition-colors"
                    title={`Call ${task.recipientPhone}`}
                  >
                    <Phone className="h-3.5 w-3.5 text-success" />
                    <span className="hidden sm:inline">Call</span>
                  </a>
                )}

                <Link href={RIDER_ROUTES.task(task.id)}>
                  <Button
                    variant={isOutForDelivery ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1"
                  >
                    <span>{isOutForDelivery ? "Deliver OTP" : "Details"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
