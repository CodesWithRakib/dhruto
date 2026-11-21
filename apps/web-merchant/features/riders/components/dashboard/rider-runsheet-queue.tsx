"use client";

import * as React from "react";
import { ArrowRight, ChevronRight, MapPin, Phone, Truck } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";
import type { RiderTaskItem } from "@dhruto/contracts";

interface RiderRunsheetQueueProps {
  tasks: RiderTaskItem[];
}

export function RiderRunsheetQueue({ tasks }: RiderRunsheetQueueProps) {
  const { bdt } = useFormatters();

  // Active / pending stops: out for delivery first, then assigned
  const activeStops = tasks.filter(
    (task) => task.status === "OUT_FOR_DELIVERY" || task.status === "ASSIGNED_TO_RIDER",
  );

  if (activeStops.length === 0) {
    return null;
  }

  return (
    <section aria-label="Today's Active Runsheet Stops" className="space-y-3">
      <div className="flex items-center justify-between">
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
        <Link
          href={RIDER_ROUTES.tasks}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          <span>All Tasks</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-border/40 rounded-2xl bg-card overflow-hidden">
        {activeStops.slice(0, 5).map((task, index) => {
          const isOutForDelivery = task.status === "OUT_FOR_DELIVERY";
          return (
            <div
              key={task.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-surface-muted/50"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    isOutForDelivery
                      ? "bg-warning/20 text-warning"
                      : "bg-surface-muted text-muted-foreground"
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
                          ? "bg-warning/15 text-warning"
                          : "bg-info/15 text-info"
                      }`}
                    >
                      {isOutForDelivery ? "Current In-Transit" : "Assigned"}
                    </span>
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

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {task.recipientPhone && (
                  <a
                    href={`tel:${task.recipientPhone}`}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-surface-muted px-3 text-xs font-bold text-foreground hover:bg-surface-muted/80"
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
