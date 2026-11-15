"use client";

import React from "react";
import { Radio } from "lucide-react";

interface WebhookKpiStripProps {
  subscriptionCount: number;
  successRate: number;
  deliveredCount: number;
  totalDeliveries: number;
  deadLetterCount: number;
}

export function WebhookKpiStrip({
  subscriptionCount,
  successRate,
  deliveredCount,
  totalDeliveries,
  deadLetterCount,
}: WebhookKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <span className="text-caption text-muted-foreground font-bold uppercase tracking-wider">
          Configured Endpoints
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-2xl font-black tabular-nums text-foreground">{subscriptionCount}</span>
          <span className="text-caption font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Active
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <span className="text-caption text-muted-foreground font-bold uppercase tracking-wider">
          Delivery Success Rate
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{successRate}%</span>
          <span className="text-caption text-muted-foreground font-medium">
            {deliveredCount}/{totalDeliveries} delivered
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <span className="text-caption text-muted-foreground font-bold uppercase tracking-wider">
          Total Dispatches (Logged)
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-2xl font-black tabular-nums text-foreground">{totalDeliveries}</span>
          <Radio className="h-4 w-4 text-primary animate-pulse" />
        </div>
      </div>

      <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <span className="text-caption text-muted-foreground font-bold uppercase tracking-wider">
          Dead Letter Queue (DLQ)
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span
            className={`text-2xl font-black tabular-nums ${deadLetterCount > 0 ? "text-amber-500" : "text-foreground"}`}
          >
            {deadLetterCount}
          </span>
          {deadLetterCount > 0 ? (
            <span className="text-caption font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
              Needs Attention
            </span>
          ) : (
            <span className="text-caption font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Clean
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
