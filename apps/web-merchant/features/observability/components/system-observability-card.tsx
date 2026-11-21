"use client";

import React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, KpiGridSkeleton } from "@dhruto/ui";
import {
  Server,
  Database,
  Zap,
  Cpu,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useGetSystemMetricsQuery } from "../api/observability.api";
import { ErrorState, RetryButton } from "@/components/feedback/states";

export function SystemObservabilityCard() {
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useGetSystemMetricsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });

  if (isLoading) {
    return <KpiGridSkeleton count={4} />;
  }

  if (isError || !metrics) {
    return (
      <Card>
        <ErrorState
          title="Telemetry service probe unreachable. Verify API server health."
          action={<RetryButton label="Retry Connection" onRetry={() => refetch()} />}
        />
      </Card>
    );
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const heapPct = Math.min(
    Math.round((metrics.memory.heapUsedMb / Math.max(metrics.memory.heapTotalMb, 1)) * 100),
    100,
  );

  return (
    <div className="space-y-6">
      {/* Primary Status Banner */}
      <Card className="bg-card">
        <CardHeader className="bg-success-soft/30 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-success-soft text-success-soft-foreground rounded-xl">
                <Server className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">System Scale & Observability Center</CardTitle>
                  <Badge
                    variant="outline"
                    className="bg-success-soft text-success-soft-foreground font-mono text-[11px]"
                  >
                    {metrics.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>
                  Node {metrics.nodeVersion} • Env: {metrics.environment} • Uptime:{" "}
                  {formatUptime(metrics.uptimeSeconds)}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Refresh Live</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Telemetry */}
            <div className="p-4 rounded-xl bg-surface space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>PostgreSQL DB</span>
                <Database className="h-4 w-4 text-info-soft-foreground" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tabular-nums text-foreground">
                  {metrics.database.latencyMs}{" "}
                  <span className="text-xs font-normal text-muted-foreground">ms</span>
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-success-soft-foreground"
                >
                  {metrics.database.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Pool: {metrics.database.clientPool.active} active /{" "}
                {metrics.database.clientPool.total} pool
              </p>
            </div>

            {/* Cache Layer Telemetry */}
            <div className="p-4 rounded-xl bg-surface space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Multi-Tier Cache</span>
                <Zap className="h-4 w-4 text-warning-soft-foreground" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-foreground">
                  {metrics.cache.hitRate}%{" "}
                  <span className="text-xs font-normal text-muted-foreground">Hit Rate</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono capitalize">
                  {metrics.cache.driver}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {metrics.cache.hits} hits • {metrics.cache.misses} misses ({metrics.cache.keysCount}{" "}
                keys)
              </p>
            </div>

            {/* Memory Usage */}
            <div className="p-4 rounded-xl bg-surface space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Heap Memory</span>
                <Cpu className="h-4 w-4 text-primary-soft-foreground" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-foreground">
                  {metrics.memory.heapUsedMb}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {metrics.memory.heapTotalMb} MB
                  </span>
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {heapPct}%
                </span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${heapPct}%` }}
                />
              </div>
            </div>

            {/* Request Throughput */}
            <div className="p-4 rounded-xl bg-surface space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Live Telemetry</span>
                <Activity className="h-4 w-4 text-success" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-foreground">
                  {metrics.telemetry.p95LatencyMs}{" "}
                  <span className="text-xs font-normal text-muted-foreground">ms p95</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-info-soft-foreground">
                  {metrics.telemetry.currentRps} RPS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {metrics.telemetry.totalRequests.toLocaleString()} requests •{" "}
                {metrics.telemetry.errorRate}% err
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Load-test and disaster-recovery cards removed: their figures (600 RPS, RPO < 15 min,
          replica failover) were hard-coded and not measured by this system. */}
    </div>
  );
}
