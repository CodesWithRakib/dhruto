"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  Building2,
  FileCheck2,
  Gavel,
  Mail,
  MapPin,
  Scale,
} from "lucide-react";

export function TermsGovernanceCard() {
  return (
    <section className="relative py-20 bg-muted/20 border-t border-border/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface p-8 sm:p-12 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Entity & Legal Framework */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Gavel className="h-3.5 w-3.5" />
                <span>LEGAL JURISDICTION & ARBITRATION</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Statutory Governance & Dispute Redressal
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                All agreements, shipments, digital ledger logs, and cash-on-delivery handling are governed under the statutory laws of Bangladesh. Any dispute arising under this SLA shall be resolved through good-faith mediation or expedited commercial arbitration in Dhaka pursuant to the Arbitration Act of 2001.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs text-foreground/90">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-500" />
                  <span>Arbitration Act 2001 (Dhaka)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                  <span>Exclusive Judicial Jurisdiction</span>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Details Card */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 lg:col-span-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Operating Entity Details</span>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                <div>
                  <div className="font-bold text-foreground">Dhruto Technologies Limited</div>
                  <div className="text-muted-foreground">Company Registration & Trade Licensee</div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-none" />
                  <div className="text-muted-foreground leading-relaxed">
                    Plot 14, Road 11, Block C, Banani, Dhaka-1213, Bangladesh
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-primary mt-0.5 flex-none" />
                  <div>
                    <div className="font-semibold text-foreground">legal@dhruto.com</div>
                    <div className="text-muted-foreground">Legal Affairs & Corporate Counsel</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                >
                  <span>Submit Inquiry to Corporate Legal Desk</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
