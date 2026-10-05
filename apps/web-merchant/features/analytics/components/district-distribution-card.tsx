"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dhruto/ui";
import { MapPin } from "lucide-react";
import { type DistrictMetric } from "@dhruto/contracts";

interface DistrictDistributionCardProps {
  districts: DistrictMetric[];
}

export function DistrictDistributionCard({ districts }: DistrictDistributionCardProps) {
  if (!districts || districts.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">Geographic Destination Spread</CardTitle>
          <CardDescription>Top districts receiving customer deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-6 text-center">
            No district distribution data available for this timeframe.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Top Regional Delivery Destinations</CardTitle>
              <CardDescription>
                Geographic volume share and fulfillment completion rates across Bangladesh
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {districts.length} Regions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {districts.map((item, idx) => (
          <div key={item.district} className="space-y-1.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground text-[11px] w-4">
                  #{idx + 1}
                </span>
                <span className="font-bold text-foreground text-sm">{item.district}</span>
                <span className="text-[11px] text-muted-foreground">({item.orderCount} orders)</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {item.successRate}% Success
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(8, item.percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
