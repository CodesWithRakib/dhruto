"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dhruto/ui";
import { ShieldAlert, AlertTriangle, Sparkles, MapPin } from "lucide-react";
import { type RtoAnalytics } from "@dhruto/contracts";

interface RtoDeepDiveCardProps {
  rto: RtoAnalytics;
}

export function RtoDeepDiveCard({ rto }: RtoDeepDiveCardProps) {
  if (!rto) return null;

  return (
    <Card className="border-danger/20 shadow-soft">
      <CardHeader className="border-b border-border/70 bg-danger-soft/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-danger-soft text-danger-soft-foreground rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">RTO Analytics & Root Cause Decomposition</CardTitle>
              <CardDescription>
                Empirical investigation into return patterns, zone vulnerabilities, and cognitive
                risk tier correlation
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono border-danger/30 text-danger-soft-foreground"
          >
            Network RTO: {rto.overallRtoRate}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Section 1: Top Return Reasons */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Primary Return Signals & Customer Feedback
          </span>
          <div className="space-y-2">
            {rto.topReasons.map((reason) => (
              <div key={reason.reason} className="p-2.5 rounded-lg border bg-card space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning-soft-foreground shrink-0" />
                    {reason.reason}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">{reason.count} cases</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {reason.percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-warning h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, reason.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Zone vs Risk Tier Correlation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          {/* Zone RTO */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Delivery Zone Vulnerability
            </span>
            <div className="space-y-2 text-xs">
              {rto.byZone.map((z) => (
                <div
                  key={z.zone}
                  className="p-2.5 rounded border bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-foreground">{z.zone}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {z.parcelCount} total shipments
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold ${z.rtoRate < 5 ? "text-success-soft-foreground" : z.rtoRate < 8 ? "text-warning-soft-foreground" : "text-danger-soft-foreground"}`}
                  >
                    {z.rtoRate}% RTO
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cognitive Risk Tier Correlation */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-warning-soft-foreground" />
              AI Risk Tier Correlation
            </span>
            <div className="space-y-2 text-xs">
              {rto.byRiskTier.map((rt) => (
                <div
                  key={rt.tier}
                  className="p-2.5 rounded border bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-foreground">{rt.tier} Risk Tier</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {rt.parcelCount} assessed orders
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-black ${rt.tier === "LOW" ? "text-success-soft-foreground" : rt.tier === "MEDIUM" ? "text-warning-soft-foreground" : "text-danger-soft-foreground"}`}
                    >
                      {rt.rtoRate}% RTO
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Actual return rate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
