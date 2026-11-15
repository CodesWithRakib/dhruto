"use client";

import React from "react";
import { Bike, ClipboardList } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";

interface RiderRunsheetProgressProps {
  completedTasks: number;
  totalTasks: number;
  inProgressTasks: number;
  completionPercent: number;
}

export function RiderRunsheetProgress({
  completedTasks,
  totalTasks,
  inProgressTasks,
  completionPercent,
}: RiderRunsheetProgressProps) {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
              <Bike className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold text-foreground">
              Today's Delivery Runsheet
            </h2>
            <Badge variant="primary-soft" className="text-[10px] font-bold border-0">
              {completionPercent}% Completed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {completedTasks} of {totalTasks} packages delivered · {inProgressTasks} currently out for delivery
          </p>
        </div>

        <Link href={RIDER_ROUTES.tasks}>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl px-4 text-xs font-bold shadow-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Open Runsheet</span>
          </Button>
        </Link>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 shadow-xs"
            style={{ width: `${Math.max(completionPercent, 4)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>Dispatched from Hub</span>
          <span className="font-bold text-foreground">
            {completedTasks} / {totalTasks} Parcels Done
          </span>
          <span>Close Shift</span>
        </div>
      </div>
    </div>
  );
}
