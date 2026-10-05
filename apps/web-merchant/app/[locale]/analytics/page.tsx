"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Warehouse,
  RotateCcw,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import {
  useGetMerchantAnalyticsQuery,
  useGetOperationalAnalyticsQuery,
} from "../../../features/analytics/api/analytics.api";
import { AnalyticsKpiGrid } from "../../../features/analytics/components/analytics-kpi-grid";
import { VolumeTrendChart } from "../../../features/analytics/components/volume-trend-chart";
import { DistrictDistributionCard } from "../../../features/analytics/components/district-distribution-card";
import { RtoDeepDiveCard } from "../../../features/analytics/components/rto-deep-dive-card";
import { CodFlowCard } from "../../../features/analytics/components/cod-flow-card";
import { HubRiderPerformanceCard } from "../../../features/analytics/components/hub-rider-performance-card";
import { SystemObservabilityCard } from "../../../features/observability/components/system-observability-card";
import { Activity } from "lucide-react";
import { type AnalyticsPeriod } from "@dhruto/contracts";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [activeTab, setActiveTab] = useState<"merchant" | "rto" | "operations" | "scale">("merchant");

  const {
    data: merchantResp,
    isLoading: isMerchantLoading,
    refetch: refetchMerchant,
  } = useGetMerchantAnalyticsQuery({ period });

  const {
    data: opsResp,
    isLoading: isOpsLoading,
    refetch: refetchOps,
  } = useGetOperationalAnalyticsQuery({ period });

  const merchantData = merchantResp?.data;
  const opsData = opsResp?.data;

  const handleRefresh = () => {
    refetchMerchant();
    refetchOps();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header with Title and Timeframe Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Dhruto Analytics Engine v2.0
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Executive Analytics & Operations Radar
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Real-time fulfillment KPIs, daily delivery trends, RTO root cause diagnostics, and cash collection auditing.
          </p>
        </div>

        {/* Timeframe selector & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-muted rounded-lg border border-border">
            {(["7d", "30d", "90d"] as AnalyticsPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p === "7d" ? "Last 7 Days" : p === "30d" ? "Last 30 Days" : "Last 90 Days"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("merchant")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === "merchant" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <TrendingUp className="h-4 w-4" />
          Fulfillment & Merchant KPIs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rto")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === "rto" ? "border-rose-500 text-rose-600 dark:text-rose-400 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <ShieldAlert className="h-4 w-4" />
          RTO Diagnostics & Risk
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === "operations" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Warehouse className="h-4 w-4" />
          Hub Throughput & Fleet
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scale")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === "scale" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Activity className="h-4 w-4" />
          System Scale & Observability
        </button>
      </div>

      {/* Tab 1: Merchant Performance & Trends */}
      {activeTab === "merchant" && (
        <div className="space-y-6">
          {merchantData && (
            <>
              <AnalyticsKpiGrid kpis={merchantData.kpis} financials={merchantData.financials} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VolumeTrendChart trends={merchantData.dailyTrends} />
                </div>
                <div className="lg:col-span-1">
                  <DistrictDistributionCard districts={merchantData.topDistricts} />
                </div>
              </div>

              {opsData && <CodFlowCard codFlow={opsData.codFlow} />}
            </>
          )}

          {isMerchantLoading && (
            <div className="py-20 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Aggregating real-time logistics analytics...</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: RTO Diagnostics */}
      {activeTab === "rto" && (
        <div className="space-y-6">
          {opsData ? (
            <RtoDeepDiveCard rto={opsData.rtoBreakdown} />
          ) : isOpsLoading ? (
            <div className="py-20 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
              <p className="text-sm text-muted-foreground">Calculating RTO return breakdown and risk factors...</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 3: Operations & Fleet Throughput */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          {opsData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Platform Shipments</span>
                  <div className="text-2xl font-black font-mono text-foreground">{opsData.totalShipments}</div>
                  <p className="text-[11px] text-muted-foreground">All-time parcels in system</p>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Active Hubs</span>
                  <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{opsData.activeHubsCount}</div>
                  <p className="text-[11px] text-muted-foreground">Operating terminal facilities</p>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Rider Fleet Size</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{opsData.activeRidersCount}</div>
                  <p className="text-[11px] text-muted-foreground">Active delivery couriers</p>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Outstanding Cash with Fleet</span>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                    ৳{opsData.outstandingCashWithRiders.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Pending hub hand-in</p>
                </div>
              </div>

              <HubRiderPerformanceCard hubs={opsData.hubThroughputList} riders={opsData.topRiders} />
            </>
          ) : isOpsLoading ? (
            <div className="py-20 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Loading hub sorting throughput and rider performance...</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 4: System Scale & Observability */}
      {activeTab === "scale" && (
        <SystemObservabilityCard />
      )}
    </div>
  );
}
