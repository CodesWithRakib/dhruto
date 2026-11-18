"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Badge } from "@dhruto/ui";

export function RiderSafetySop() {
  const [showSop, setShowSop] = useState(true);

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-5 sm:p-6 overflow-hidden">
      {/* Specular top highlight */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Doorstep Delivery & Cash Protocol
              </h3>
              <Badge variant="primary-soft" className="text-[10px] font-bold">
                Rider Safety SOP
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 mandatory steps for every delivery handoff and cash collection.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSop(!showSop)}
          className="inline-flex h-9 items-center justify-center gap-1.5 self-start sm:self-center rounded-xl bg-surface-muted/60 px-3 text-xs font-bold text-foreground hover:bg-surface-muted transition-colors"
        >
          <span>{showSop ? "Collapse SOP" : "View SOP Guide"}</span>
          {showSop ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showSop ? (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-4">
          <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10 text-info font-bold text-xs">
                1
              </span>
              <span className="text-xs font-bold text-foreground">GPS Navigation</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Open Google Maps / Waze directly from the task card to reach the customer address accurately.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success font-bold text-xs">
                2
              </span>
              <span className="text-xs font-bold text-foreground">6-Digit OTP Handshake</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Request the 6-digit verification code from the customer before unboxing or handing over the package.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-warning font-bold text-xs">
                3
              </span>
              <span className="text-xs font-bold text-foreground">Exact COD Collection</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Collect the exact cash amount shown on screen. Confirm physical cash or digital payment before marking done.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                4
              </span>
              <span className="text-xs font-bold text-foreground">Hub Cash Hand-In</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              At the end of your shift, hand in all collected cash at the Hub Cash Desk to settle your daily ledger.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
