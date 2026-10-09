"use client";

import React from "react";
import { CheckCircle2, Database } from "lucide-react";

interface LifecycleStage {
  step: string;
  title: string;
  retention: string;
  description: string;
  bullets: string[];
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    step: "01",
    title: "Collection & Intake",
    retention: "Ephemeral Session",
    description: "We strictly capture only the minimal coordinates necessary to physical dispatch: recipient contact, delivery address, and parcel dimensions.",
    bullets: [
      "Zero invasive behavioral or advertising tracking cookies",
      "Encrypted ingress via TLS 1.3 with Perfect Forward Secrecy",
      "Immediate validation and geocoding into regional hub routing",
    ],
  },
  {
    step: "02",
    title: "In-Transit Telemetry",
    retention: "30 Days Active",
    description: "Rider GPS location and barcode scans are recorded in real time during the shipment journey to provide ETA visibility and prevent loss.",
    bullets: [
      "High-frequency GPS breadcrumbs automatically purged after 30 days",
      "Tamper-evident bag scan timestamps preserved permanently",
      "4-digit OTP recipient verification recorded at physical handover",
    ],
  },
  {
    step: "03",
    title: "COD Escrow & Financial Ledger",
    retention: "7 Years (Statutory)",
    description: "Cash-on-delivery collection receipts and payout transaction references are stored in an append-only cryptographic ledger.",
    bullets: [
      "Itemized transaction history matching merchant bank statements",
      "Strict compliance with Bangladesh Bank & NBR financial guidelines",
      "Immutable ledger records cannot be retroactively altered",
    ],
  },
  {
    step: "04",
    title: "Merchant Rights & Deletion",
    retention: "On-Demand Deletion",
    description: "Merchants retain total ownership over customer lists and can export complete parcel archives or request comprehensive PII scrubbing.",
    bullets: [
      "One-click complete CSV/JSON export of all historical parcels",
      "Permanent account closure and recipient PII pseudonymization",
      "Dedicated Data Protection Officer (DPO) request processing",
    ],
  },
];

export function PrivacyDataLifecycle() {
  return (
    <section className="relative py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>DATA LIFECYCLE & RETENTION</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How Long We Retain Data & How It Is Purged
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            We adhere to the principle of data minimization. Operational telemetry is purged once deliveries complete, while financial records remain audit-ready.
          </p>
        </div>

        {/* 4 Lifecycle Cards Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE_STAGES.map((stage) => {
            return (
              <div
                key={stage.step}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-extrabold text-primary">
                      {stage.step}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {stage.retention}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {stage.description}
                  </p>
                </div>

                <ul className="mt-6 space-y-2 border-t border-border/60 pt-4 text-xs text-foreground/90">
                  {stage.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-none" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
