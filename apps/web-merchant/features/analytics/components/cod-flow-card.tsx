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
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="border-b bg-primary/5">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
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
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>1. Booked COD</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {formatBDT(codFlow.totalBooked)}
            </div>
            <p className="text-[11px] text-muted-foreground">Total order volume generated</p>
          </div>

          {/* Step 2: In-Transit with Riders */}
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>2. With Delivery Riders</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {formatBDT(codFlow.inTransitWithRiders)}
            </div>
            <p className="text-[11px] text-muted-foreground">Collected cash in transit</p>
          </div>

          {/* Step 3: Hub Reconciliation */}
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>3. Hub Reconciliation</span>
              <ShieldCheck className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {formatBDT(codFlow.collectedUnsettled)}
            </div>
            <p className="text-[11px] text-muted-foreground">Verified at hub cash desk</p>
          </div>

          {/* Step 4: Settled to Merchants */}
          <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>4. Settled to Wallet</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatBDT(codFlow.settledToMerchants)}
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Ready for instant payout withdrawal
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
