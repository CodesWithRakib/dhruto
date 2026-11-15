"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";

export function HubSopGuide() {
  const [showSop, setShowSop] = useState(true);
  const [activeSopTab, setActiveSopTab] = useState<"morning" | "midday" | "evening">("morning");

  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-5 sm:p-6 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Hub Standard Operating Procedures (SOP)
              </h3>
              <Badge variant="primary-soft" className="text-[10px] font-bold border-0">
                Operator Handbook
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official shift protocol for high-throughput scanning, bag sealing, and COD handover.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSop(!showSop)}
          className="gap-1.5 self-start sm:self-center rounded-xl bg-surface-muted/60 hover:bg-surface-muted"
        >
          <span>{showSop ? "Collapse SOP" : "View SOP Guide"}</span>
          {showSop ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {showSop ? (
        <div className="mt-4 pt-4 border-t border-border/40 space-y-3.5">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "morning", label: "Morning Shift (07:00 - 11:00)", badge: "Inbound & Runsheet" },
              { id: "midday", label: "Mid-day Shift (11:00 - 16:00)", badge: "Sorting & Bagging" },
              { id: "evening", label: "Evening Shift (16:00 - 21:00)", badge: "Cash Desk & Manifests" },
            ].map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setActiveSopTab(shift.id as "morning" | "midday" | "evening")}
                className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeSopTab === shift.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{shift.label}</span>
                <span
                  className={`text-[10px] rounded-lg px-1.5 py-0.5 ${
                    activeSopTab === shift.id
                      ? "bg-white/20 text-white"
                      : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {shift.badge}
                </span>
              </button>
            ))}
          </div>

          {activeSopTab === "morning" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 1 · Linehaul Arrival
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Inspect inbound vehicle seals, verify manifest ID against incoming linehaul truck, and mark manifest received.
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 2 · High-Speed Inbound Scan
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Use barcode scanner in Continuous Inbound mode. Every parcel status immediately transitions to <code className="text-primary font-bold">AT_HUB</code>.
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 3 · Rider Dispatch Runsheet
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Sort packages by delivery zone and assign to on-duty delivery riders for morning last-mile attempt.
                </p>
              </div>
            </div>
          )}

          {activeSopTab === "midday" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 1 · Bin Sorting
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Direct parcels into dedicated destination bins (Chittagong, Sylhet, Rajshahi, Khulna, etc.).
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 2 · Bag Consolidation
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Open a new bag for the destination hub, scan parcels into the bag, and audit package weights.
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 3 · Tamper-Evident Seal
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Affix serialized security seal tag, enter the seal tag number, and transition bag status to <code className="text-primary font-bold">SEALED</code>.
                </p>
              </div>
            </div>
          )}

          {activeSopTab === "evening" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 1 · Rider Cash Hand-In
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Collect and count COD cash from returning riders at the Cash Desk. Confirm counted amount against system expected total.
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 2 · Discrepancy Logging
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  If counted cash differs, system automatically opens a formal discrepancy ticket with audit notes for finance review.
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-3.5">
                <span className="font-mono text-xs font-bold text-primary block">
                  Step 3 · Night Linehaul Dispatch
                </span>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Bundle sealed bags into an outbound Manifest, assign vehicle number and driver phone, and mark <code className="text-primary font-bold">DISPATCHED</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
