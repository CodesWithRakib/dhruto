"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dhruto/ui";
import { Wallet, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { type CodFlowAnalytics } from "@dhruto/contracts";
import { formatBDT } from "@/lib/format";

interface CodFlowCardProps {
  codFlow: CodFlowAnalytics;
}

export function CodFlowCard({ codFlow }: CodFlowCardProps) {
  if (!codFlow) return null;

  return (
    <Card className="border-primary/20 shadow-soft">
      <CardHeader className="border-b border-border/70 bg-primary-soft/30">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary-soft text-primary-soft-foreground rounded-lg">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">COD Cashflow & Settlement Velocity</CardTitle>
            <CardDescription>
              End-to-end reconciliation pipeline from doorstep cash collection to wallet payout
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {/* Step 1: Booked COD */}
          <div className="p-4 rounded-xl border border-border/70 bg-surface space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>1. Booked COD</span>
              <Clock className="h-4 w-4 text-info-soft-foreground" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {formatBDT(codFlow.totalBooked)}
            </div>
            <p className="text-[11px] text-muted-foreground">Total order volume generated</p>
          </div>

          {/* Step 2: In-Transit with Riders */}
          <div className="p-4 rounded-xl border border-border/70 bg-surface space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>2. With Delivery Riders</span>
              <Clock className="h-4 w-4 text-warning-soft-foreground" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black font-mono text-warning-soft-foreground">
              {formatBDT(codFlow.inTransitWithRiders)}
            </div>
            <p className="text-[11px] text-muted-foreground">Collected cash in transit</p>
          </div>

          {/* Step 3: Hub Reconciliation */}
          <div className="p-4 rounded-xl border border-border/70 bg-surface space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>3. Hub Reconciliation</span>
              <ShieldCheck className="h-4 w-4 text-primary-soft-foreground" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black font-mono text-primary-soft-foreground">
              {formatBDT(codFlow.collectedUnsettled)}
            </div>
            <p className="text-[11px] text-muted-foreground">Verified at hub cash desk</p>
          </div>

          {/* Step 4: Settled to Merchants */}
          <div className="p-4 rounded-xl border border-success/25 bg-success-soft/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>4. Settled to Wallet</span>
              <CheckCircle2 className="h-4 w-4 text-success-soft-foreground" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black font-mono text-success-soft-foreground">
              {formatBDT(codFlow.settledToMerchants)}
            </div>
            <p className="text-[11px] text-success-soft-foreground">
              Ready for instant payout withdrawal
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
