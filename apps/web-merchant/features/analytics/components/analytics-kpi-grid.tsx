"use client";

import React from "react";
import { Card, CardContent } from "@dhruto/ui";
import { CheckCircle2, RotateCcw, Clock, Wallet, TrendingUp, Package } from "lucide-react";
import { type MerchantKpis, type MerchantFinancialAnalytics } from "@dhruto/contracts";
import { formatBDT } from "@/lib/format";

interface AnalyticsKpiGridProps {
  kpis: MerchantKpis;
  financials: MerchantFinancialAnalytics;
}

export function AnalyticsKpiGrid({ kpis, financials }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Delivery Success Rate */}
      <Card className="border-success/20 bg-gradient-to-br from-card via-card to-success-soft/40 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery Success Rate
            </span>
            <div className="p-2 rounded-lg bg-success-soft text-success-soft-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tabular-nums text-foreground">
              {kpis.deliverySuccessRate}%
            </span>
            <span className="text-xs text-success-soft-foreground font-medium flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-0.5 inline" aria-hidden="true" />
              Optimal
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/70">
            <span>Delivered Shipments</span>
            <span className="font-mono font-bold text-foreground">
              {kpis.deliveredOrders} / {kpis.totalOrders}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* RTO Return Rate */}
      <Card className="border-danger/20 bg-gradient-to-br from-card via-card to-danger-soft/40 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              RTO Return Rate
            </span>
            <div className="p-2 rounded-lg bg-danger-soft text-danger-soft-foreground">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tabular-nums text-foreground">{kpis.rtoRate}%</span>
            <span
              className={`text-xs font-medium ${kpis.rtoRate < 8 ? "text-success-soft-foreground" : "text-warning-soft-foreground"}`}
            >
              {kpis.rtoRate < 8 ? "Below Target (Good)" : "Action Advised"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/70">
            <span>Returned / Cancelled</span>
            <span className="font-mono font-bold text-foreground">
              {kpis.returnedOrders} Orders
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total COD Collections */}
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary-soft/40 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collected Cash on Delivery
            </span>
            <div className="p-2 rounded-lg bg-primary-soft text-primary-soft-foreground">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono tabular-nums text-foreground">
              {formatBDT(financials.collectedCod)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/70">
            <span>Pending In-Transit COD</span>
            <span className="font-mono font-bold text-foreground">
              {formatBDT(financials.pendingCod)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Average Delivery Duration */}
      <Card className="border-warning/20 bg-gradient-to-br from-card via-card to-warning-soft/40 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Average Delivery Velocity
            </span>
            <div className="p-2 rounded-lg bg-warning-soft text-warning-soft-foreground">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tabular-nums text-foreground">
              {kpis.avgDeliveryHours}
            </span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/70">
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
