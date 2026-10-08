"use client";

import React from "react";
import { Check, X, Sparkles, Award } from "lucide-react";

interface ComparisonRow {
  feature: string;
  traditional: string;
  dhruto: string;
  highlight?: boolean;
}

const COMPARISONS: ComparisonRow[] = [
  {
    feature: "COD Cash Payouts",
    traditional: "3 to 7 Days delay with manual check reconciliation",
    dhruto: "Automated Next-Day direct bank & wallet transfer",
    highlight: true,
  },
  {
    feature: "COD Commission Rate",
    traditional: "1.5% - 2.5% with hidden weight & handling charges",
    dhruto: "0% - 1% flat, completely transparent pricing matrix",
  },
  {
    feature: "Address & RTO Protection",
    traditional: "Manual calling, 15%+ return to origin (RTO) rate",
    dhruto: "AI bilingual address parsing & buyer fraud reliability score",
    highlight: true,
  },
  {
    feature: "Real-Time Tracking",
    traditional: "Static batch text updates; calls to delivery boy",
    dhruto: "Live GPS radar map & milestone SMS/WhatsApp updates",
  },
  {
    feature: "e-Commerce Store Integration",
    traditional: "Manual booking or complex slow portal",
    dhruto: "1-Click Shopify, WooCommerce & open REST APIs",
  },
  {
    feature: "Dedicated Merchant Support",
    traditional: "Generic helpline ticket queues",
    dhruto: "Dedicated Key Account Manager & 24/7 operations line",
  },
];

export function ComparisonSection() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="dhruto-container relative z-10">
        {/* Section Heading */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Award className="h-3.5 w-3.5" />
            <span>The Modern Competitive Edge</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-balance">
            Why Modern Merchants Switch to Dhruto
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
            See the difference between legacy courier practices and our tech-driven logistics operating system.
          </p>
        </div>

        {/* Comparison Table Card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  <th className="py-5 px-6 text-sm font-bold uppercase tracking-wider text-muted-foreground w-1/3">
                    Feature / Capability
                  </th>
                  <th className="py-5 px-6 text-sm font-bold uppercase tracking-wider text-muted-foreground/70 w-1/3">
                    Traditional Couriers
                  </th>
                  <th className="py-5 px-6 text-sm font-bold uppercase tracking-wider text-primary w-1/3 bg-primary/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Dhruto Operating System</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {COMPARISONS.map((row) => (
                  <tr
                    key={row.feature}
                    className={`transition-colors hover:bg-surface-muted/40 ${
                      row.highlight ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="py-4 sm:py-5 px-6 font-bold text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-4 sm:py-5 px-6 text-muted-foreground">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive mt-0.5">
                          <X className="h-3 w-3" />
                        </span>
                        <span className="leading-snug">{row.traditional}</span>
                      </div>
                    </td>
                    <td className="py-4 sm:py-5 px-6 bg-primary/5 text-foreground font-medium">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5 shadow-sm shadow-primary/30">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="leading-snug text-foreground font-semibold">{row.dhruto}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
