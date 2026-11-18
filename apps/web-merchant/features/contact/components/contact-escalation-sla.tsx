"use client";

import React from "react";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

interface EscalationTier {
  level: string;
  title: string;
  sla: string;
  channel: string;
  description: string;
  bullets: string[];
}

const ESCALATION_TIERS: EscalationTier[] = [
  {
    level: "Tier 01",
    title: "Instant Digital Telemetry & Self-Service",
    sla: "Instantaneous (< 1 sec)",
    channel: "Public Tracking Link & SMS Gateway",
    description: "Every shipment status change is broadcast in real time with optical scan timestamps and driver geolocation.",
    bullets: [
      "Zero login required for recipients or customer support agents",
      "Automatic SMS alerts with rider name and direct phone number",
      "Live geofenced delivery window prediction",
    ],
  },
  {
    level: "Tier 02",
    title: "Merchant Operations Desk & Dispatch Re-Route",
    sla: "Under 18 Minutes",
    channel: "Dedicated Merchant Desk / WhatsApp Dispatch",
    description: "When an address requires correction, a recipient requests a new time slot, or a rider faces access issues.",
    bullets: [
      "Direct phone & ticket coordination with territorial dispatchers",
      "Immediate mid-flight delivery schedule re-booking",
      "3-attempt OTP audit logging before any return is authorized",
    ],
  },
  {
    level: "Tier 03",
    title: "Divisional Hub Manager & Claims Executive",
    sla: "Under 2 Hours",
    channel: "Senior Operations Desk & Loss Escrow Unit",
    description: "For critical cargo exceptions, line-haul transit delays, or physical container damage verification.",
    bullets: [
      "Physical sorting belt CCTV review & tamper seal audit",
      "Direct line to regional hub director for high-value parcels",
      "Automated escrow claims settlement if cargo is verified damaged",
    ],
  },
];

export function ContactEscalationSLA() {
  return (
    <section className="relative py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>DISPATCH SLA COMMITMENTS</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            A Transparent Three-Tier Escalation Protocol
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            We don&apos;t leave parcel inquiries stranded in bureaucratic queues. Every issue is governed by strict, measurable time-to-action SLAs.
          </p>
        </div>

        {/* 3 Tiers Grid */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {ESCALATION_TIERS.map((tier) => {
            return (
              <div
                key={tier.level}
                className="group relative flex flex-col justify-between rounded-2xl bg-surface p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
                      {tier.level}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{tier.sla}</span>
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
                    {tier.title}
                  </h3>
                  <div className="mt-1 text-xs font-semibold text-primary">
                    {tier.channel}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {tier.description}
                  </p>

                  <ul className="mt-5 space-y-2.5 pt-4 text-xs text-foreground/90">
                    {tier.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-none" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
