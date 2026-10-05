"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dhruto/ui";
import { Warehouse, Bike } from "lucide-react";
import { type HubThroughputMetric, type TopRiderMetric } from "@dhruto/contracts";

interface HubRiderPerformanceCardProps {
  hubs: HubThroughputMetric[];
  riders: TopRiderMetric[];
}

export function HubRiderPerformanceCard({ hubs, riders }: HubRiderPerformanceCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hub Throughput */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Hub Sorting & Throughput Velocity</CardTitle>
                <CardDescription>
                  Inbound scanning, consolidation, and transit bag processing capacity
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {hubs.length} Hubs Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {hubs.map((hub) => (
            <div key={hub.hubId} className="p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{hub.hubName}</h4>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">
                    Code: {hub.code}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Inventory: {hub.inventoryCount}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase">Incoming</span>
                  <span className="font-mono font-bold text-foreground">{hub.totalIncoming}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase">Sorted</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{hub.totalSorted}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase">Dispatched</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{hub.totalDispatched}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rider Fleet Performance */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Last-Mile Rider Fleet Efficiency</CardTitle>
                <CardDescription>
                  Doorstep delivery fulfillment rankings, on-time rate, and cash collection
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Leaderboard
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-3">
          {riders.map((rider, index) => (
            <div key={rider.riderId} className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{rider.name}</h4>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {rider.hubName} • {rider.phone}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {rider.deliveredCount} Delivered ({rider.completionRate}%)
                </div>
                <span className="text-[11px] text-muted-foreground font-mono block">
                  ৳{rider.cashCollected.toLocaleString()} Cash Collected
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
