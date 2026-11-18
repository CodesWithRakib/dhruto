"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import { useGetSystemMetricsQuery } from "@/features/observability/api/observability.api";
import { cn } from "@/lib/cn";

export function PublicStatusIndicator() {
  const { data: metrics, isError } = useGetSystemMetricsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  });

  const isHealthy = !isError && (!metrics || metrics.status === "healthy");
  const isDegraded = !isError && metrics?.status === "degraded";

  return (
    <Link
      href="/status"
      className={cn(
        "hidden xl:inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90 hover:bg-white/10 transition-all",
      )}
      title={
        metrics
          ? `System Health: ${metrics.status.toUpperCase()} • DB Ping: ${metrics.database.latencyMs}ms • Memory: ${metrics.memory.heapUsedMb}MB`
          : "System Status Telemetry"
      }
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isHealthy
              ? "bg-success"
              : isDegraded
                ? "bg-warning"
                : "bg-danger",
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isHealthy
              ? "bg-success"
              : isDegraded
                ? "bg-warning"
                : "bg-danger",
          )}
        />
      </span>
      <span className="text-[11px] font-semibold text-white/80">
        {isHealthy ? "Systems Operational" : isDegraded ? "Degraded" : "Unreachable"}
      </span>
    </Link>
  );
}
