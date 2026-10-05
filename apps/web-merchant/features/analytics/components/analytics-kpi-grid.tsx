"use client";

import React from "react";
import { Card, CardContent } from "@dhruto/ui";
import {
  CheckCircle2,
  RotateCcw,
  Clock,
  Wallet,
  TrendingUp,
  Package,
} from "lucide-react";
import { type MerchantKpis, type MerchantFinancialAnalytics } from "@dhruto/contracts";

interface AnalyticsKpiGridProps {
  kpis: MerchantKpis;
  financials: MerchantFinancialAnalytics;
}

export function AnalyticsKpiGrid({ kpis, financials }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Delivery Success Rate */}
      <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery Success Rate
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-foreground">
              {kpis.deliverySuccessRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-0.5 inline" />
              Optimal
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Delivered Shipments</span>
            <span className="font-mono font-bold text-foreground">
              {kpis.deliveredOrders} / {kpis.totalOrders}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* RTO Return Rate */}
      <Card className="shadow-sm border-rose-500/20 bg-gradient-to-br from-card via-card to-rose-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              RTO Return Rate
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <RotateCcw className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-foreground">
              {kpis.rtoRate}%
            </span>
            <span className={`text-xs font-medium ${kpis.rtoRate < 8 ? "text-emerald-600" : "text-amber-600"}`}>
              {kpis.rtoRate < 8 ? "Below Target (Good)" : "Action Advised"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Returned / Cancelled</span>
            <span className="font-mono font-bold text-foreground">
              {kpis.returnedOrders} Orders
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total COD Collections */}
      <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collected Cash on Delivery
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-foreground">
              ৳{financials.collectedCod.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Pending In-Transit COD</span>
            <span className="font-mono font-bold text-foreground">
              ৳{financials.pendingCod.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Average Delivery Duration */}
      <Card className="shadow-sm border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Average Delivery Velocity
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-foreground">
              {kpis.avgDeliveryHours}
            </span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Active Pipeline Volume</span>
            <span className="font-mono font-bold text-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-primary" />
              {kpis.inTransitOrders + kpis.pendingOrders} parcels
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
