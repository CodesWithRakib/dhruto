"use client";

import React from "react";
import { Check, ShieldCheck, X } from "lucide-react";

interface MatrixRow {
  feature: string;
  dhrutoValue: string;
  dhrutoDetail: string;
  traditionalValue: string;
  traditionalDetail: string;
}

const COMPARISON_ROWS: MatrixRow[] = [
  {
    feature: "Advance Registration Deposit",
    dhrutoValue: "৳0 Free",
    dhrutoDetail: "Zero mandatory deposit or advance wallet locking",
    traditionalValue: "৳2,000 – ৳5,000",
    traditionalDetail: "Mandatory security deposit before shipping",
  },
  {
    feature: "COD Escrow Payout Speed",
    dhrutoValue: "Next Morning (10:00 AM)",
    dhrutoDetail: "Automated disbursement to bKash, Nagad, or BEFTN",
    traditionalValue: "3 to 7 Days Delay",
    traditionalDetail: "Manual batch approvals causing merchant cash flow drag",
  },
  {
    feature: "Cash Collection (COD) Fee",
    dhrutoValue: "1.0% (down to 0.5%)",
    dhrutoDetail: "Transparent ledger line item shown before booking",
    traditionalValue: "1.5% to 2.5%",
    traditionalDetail: "Often bundled with obscure merchant deductions",
  },
  {
    feature: "Return (RTO) Fee on Non-Delivery",
    dhrutoValue: "50% of Base Rate",
    dhrutoDetail: "Fair risk-sharing; you never pay double freight",
    traditionalValue: "100% Full Freight",
    traditionalDetail: "Merchant charged full round-trip cost",
  },
  {
    feature: "Failed Delivery Verification",
    dhrutoValue: "3 Attempts + Recipient OTP",
    dhrutoDetail: "Documented customer reason code before return is approved",
    traditionalValue: "1 Attempt / Rider Guess",
    traditionalDetail: "Parcels returned without notifying merchant or customer",
  },
  {
    feature: "Fuel & Platform Surcharge",
    dhrutoValue: "৳0.00 (Guaranteed Zero)",
    dhrutoDetail: "Published rates are all-inclusive; no surprises",
    traditionalValue: "3% – 5% Added Fee",
    traditionalDetail: "Arbitrary periodic adjustments on month-end invoice",
  },
  {
    feature: "Public Tracking & Recipient SMS",
    dhrutoValue: "Included Free (EN & বাংলা)",
    dhrutoDetail: "Sub-second milestone timeline with zero account login",
    traditionalValue: "Extra Charge or App Only",
    traditionalDetail: "Forces recipient to download clunky proprietary app",
  },
];

export function PricingTransparencyMatrix() {
  return (
    <section className="relative py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>TRANSPARENCY AUDIT</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How Dhruto Compares to Legacy Courier Services
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            See why high-growth e-commerce merchants and enterprise retailers migrate their deliveries to Dhruto’s auditable logistics operating system.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="py-4.5 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Capability & Billing Term
                  </th>
                  <th className="py-4.5 px-6 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10">
                    Dhruto Express
                  </th>
                  <th className="py-4.5 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Legacy Courier Market
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`transition-colors hover:bg-muted/30 ${
                      idx % 2 === 0 ? "bg-surface" : "bg-muted/10"
                    }`}
                  >
                    <td className="py-4.5 px-6 font-semibold text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-4.5 px-6 bg-primary/[0.04]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                        <span className="font-bold text-foreground">
                          {row.dhrutoValue}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground pl-7">
                        {row.dhrutoDetail}
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                        <span className="font-semibold text-muted-foreground">
                          {row.traditionalValue}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/80 pl-7">
                        {row.traditionalDetail}
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
