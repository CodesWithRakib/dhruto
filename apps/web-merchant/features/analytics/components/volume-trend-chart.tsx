"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dhruto/ui";
import { BarChart2, Calendar } from "lucide-react";
import { type DailyTrendPoint } from "@dhruto/contracts";

interface VolumeTrendChartProps {
  trends: DailyTrendPoint[];
}

export function VolumeTrendChart({ trends }: VolumeTrendChartProps) {
  const [metricType, setMetricType] = useState<"count" | "cod">("count");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!trends || trends.length === 0) {
    return null;
  }

  // Calculate maximum values for scaling
  const maxCount = Math.max(...trends.map((t) => Math.max(t.booked, t.delivered, t.returned, 1)), 10);
  const maxCod = Math.max(...trends.map((t) => t.codCollected || 1), 5000);
  const totalBooked = trends.reduce((acc, t) => acc + t.booked, 0);
  const totalDelivered = trends.reduce((acc, t) => acc + t.delivered, 0);
  const totalCod = trends.reduce((acc, t) => acc + t.codCollected, 0);

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Delivery Velocity & Volume Trends</CardTitle>
              <CardDescription>
                Chronological timeline of daily order creation, delivery fulfillment, and COD cashflows
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMetricType("count")}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${metricType === "count" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Order Count
            </button>
            <button
              type="button"
              onClick={() => setMetricType("cod")}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${metricType === "cod" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              COD Revenue (৳)
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Metric Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
              <span>Booked ({totalBooked})</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
              <span>Delivered ({totalDelivered})</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
              <span>RTO / Returned</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{trends.length} Days Aggregated</span>
          </div>
        </div>

        {/* Visual Bar Visualizer */}
        <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 relative border-b">
          {trends.map((point, index) => {
            const isHovered = hoveredIdx === index;
            const bookedHeight = Math.max(8, (point.booked / maxCount) * 100);
            const deliveredHeight = Math.max(8, (point.delivered / maxCount) * 100);
            const codHeight = Math.max(8, (point.codCollected / maxCod) * 100);

            return (
              <div
                key={point.date}
                className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-20 z-20 bg-popover text-popover-foreground border shadow-lg rounded-lg p-2.5 text-xs whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 min-w-[140px]">
                    <div className="font-bold text-[11px] border-b pb-1 mb-1 font-mono text-foreground">
                      {point.date}
                    </div>
                    {metricType === "count" ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between gap-2 text-blue-600 dark:text-blue-400">
                          <span>Booked:</span>
                          <span className="font-mono font-bold">{point.booked}</span>
                        </div>
                        <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400">
                          <span>Delivered:</span>
                          <span className="font-mono font-bold">{point.delivered}</span>
                        </div>
                        <div className="flex justify-between gap-2 text-rose-600 dark:text-rose-400">
                          <span>Returned:</span>
                          <span className="font-mono font-bold">{point.returned}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between gap-2 text-primary font-bold">
                        <span>COD Collected:</span>
                        <span className="font-mono">৳{point.codCollected.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bars */}
                {metricType === "count" ? (
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Booked Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-blue-500/80 hover:bg-blue-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${bookedHeight}%` }}
                    />
                    {/* Delivered Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-emerald-500/90 hover:bg-emerald-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${deliveredHeight}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className="w-full max-w-[24px] bg-gradient-to-t from-primary/60 to-primary rounded-t-sm transition-all duration-300"
                      style={{ height: `${codHeight}%` }}
                    />
                  </div>
                )}

                {/* X-Axis Date Label */}
                <span className="text-[10px] text-muted-foreground mt-2 truncate max-w-[42px] font-mono">
                  {point.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-muted-foreground block">Period Total Deliveries</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {totalDelivered} orders
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-muted-foreground block">Period COD Collected</span>
            <span className="text-lg font-bold font-mono text-foreground">
              ৳{totalCod.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-muted-foreground block">Daily Booking Velocity</span>
            <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {(totalBooked / Math.max(1, trends.length)).toFixed(1)} / day
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
