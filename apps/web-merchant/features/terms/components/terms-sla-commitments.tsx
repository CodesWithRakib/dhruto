"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface SLACard {
  id: string;
  category: string;
  metric: string;
  target: string;
  description: string;
  penalties: string;
  guaranteeBadge: string;
  keyPoints: string[];
}

const SLA_STANDARDS: SLACard[] = [
  {
    id: "dispatch",
    category: "Fulfillment & On-Time Delivery",
    metric: "99.2% Success Benchmark",
    target: "12h Metro / 48h Nationwide",
    description:
      "All regular packages booked before 2:00 PM are sorted same-day at regional line-haul hubs and delivered within contractual windows.",
    penalties:
      "Automatic 50% shipping fee rebate credited to merchant ledger if standard metro shipment exceeds 48 hours without weather or force majeure notice.",
    guaranteeBadge: "Carrier Time Guarantee",
    keyPoints: [
      "Dhaka Metro rapid pickup within 60-90 minutes of booking confirmation",
      "Strict cut-off transparency: 2:00 PM for same-day inter-district line-haul departure",
      "Real-time GPS scan timestamps at physical handover between hubs",
    ],
  },
  {
    id: "cod-escrow",
    category: "Cash on Delivery & Remittance",
    metric: "T+1 Automated Remittance",
    target: "Next-Morning Payout",
    description:
      "All physical cash collected by couriers is reconciled in the evening hub sweep and released directly to merchant bank accounts or MFS wallets.",
    penalties:
      "Zero withholding or rollover. In the event of a banking technical delay exceeding 48 hours, merchant receives an automatic priority settlement credit.",
    guaranteeBadge: "Statutory Escrow SLA",
    keyPoints: [
      "Settlement supported via BEFTN, NPSB instant transfer, bKash, and Nagad",
      "Transparent ledger breakdown showing gross collection less contractual courier charge",
      "Itemized statement exportable daily in CSV/PDF formats",
    ],
  },
  {
    id: "rto-handling",
    category: "Return to Origin (RTO) Protocol",
    metric: "3 Verified Delivery Attempts",
    target: "Anti-Fraud Call Verification",
    description:
      "A parcel is never marked as returned without exhaustive delivery attempts, customer contact logs, and automated SMS OTP validation.",
    penalties:
      "If a delivery rider prematurely returns a parcel without documented customer phone contact logs, return logistics fees are 100% waived.",
    guaranteeBadge: "Fair RTO Guarantee",
    keyPoints: [
      "Mandatory call attempts logged with telecom timestamp evidence",
      "48-hour customer reschedule holding window at recipient local hub",
      "Discounted reverse logistics fee: only 50% of the forward shipping rate",
    ],
  },
  {
    id: "cargo-protection",
    category: "Cargo Loss & Transit Damage",
    metric: "100% Declared Value Coverage",
    target: "72h Claim Resolution",
    description:
      "Full indemnification for damaged, broken, or lost shipments while under Dhruto custody from pickup barcode scan to recipient signature.",
    penalties:
      "Fast-track claim review finalized within 3 business days, with direct wallet credit or bank reimbursement applied upon verification.",
    guaranteeBadge: "Escrow Insured",
    keyPoints: [
      "Comprehensive protection covering physical transit accidents, theft, or hub mishandling",
      "Simplified photographic digital claim filing via Merchant Dashboard",
      "Zero deductible or hidden assessment deductions for standard merchant tiers",
    ],
  },
];

export function TermsSLACommitments() {
  const [activeCard, setActiveCard] = useState<string>("dispatch");
  const selectedSla = SLA_STANDARDS.find((s) => s.id === activeCard) ?? SLA_STANDARDS[0]!;

  return (
    <section id="sla-commitments" className="relative py-24 bg-surface scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" />
            <span>CONTRACTUAL PERFORMANCE STANDARDS</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Service Level Agreement (SLA) Commitments
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Unlike informal courier arrangements, Dhruto legally codifies operational delivery benchmarks, payout settlement timelines, and merchant compensation guarantees.
          </p>
        </div>

        {/* SLA Interactive Switcher & Details Grid */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left: SLA Category Selector */}
          <div className="space-y-3 lg:col-span-5">
            {SLA_STANDARDS.map((item) => {
              const isSelected = item.id === activeCard;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCard(item.id)}
                  className={`w-full text-left rounded-2xl p-5 transition-all text-left ${
                    isSelected
                      ? "bg-primary/5"
                      : "bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.target}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-bold text-foreground">
                    {item.metric}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed SLA Card */}
          <div className="rounded-3xl bg-card p-6 sm:p-10 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {selectedSla.category}
                </span>
                <h3 className="mt-1 text-2xl font-extrabold text-foreground">
                  {selectedSla.metric}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{selectedSla.guaranteeBadge}</span>
              </span>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Operational Guarantee & Scope
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {selectedSla.description}
              </p>
            </div>

            {/* SLA Key Rules List */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mandatory Execution Rules
              </h4>
              {selectedSla.keyPoints.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-xl bg-muted/30 p-3.5 text-xs text-foreground/90">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>

            {/* Penalty & Remedy Clause */}
            <div className="mt-6 rounded-2xl bg-warning/10 p-5 text-xs">
              <div className="flex items-center gap-2 font-bold text-warning-soft-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Default Penalty & Merchant Remedy</span>
              </div>
              <p className="mt-2 leading-relaxed text-warning-soft-foreground/90">
                {selectedSla.penalties}
              </p>
            </div>

            {/* Summary Benchmark Bar */}
            <div className="mt-6 pt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Targets are measured from booking to doorstep handoff.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
