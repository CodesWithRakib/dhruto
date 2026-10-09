"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export function PrivacyDPOContact() {
  return (
    <section className="relative py-20 bg-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface p-8 sm:p-12 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>DATA PROTECTION OFFICE (DPO)</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Exercise Your Data Privacy Rights
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Under Bangladeshi digital privacy frameworks, merchants and consumers retain full rights to request an audit of their stored personal data, correct inaccurate records, or submit formal erasure notices.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs text-foreground/90">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>SLA: 48-Hour Official Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No Fee for Access Requests</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 lg:col-span-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Official Compliance Channel
              </div>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-primary mt-0.5 flex-none" />
                  <div>
                    <div className="font-semibold text-foreground">dpo@dhruto.com</div>
                    <div className="text-muted-foreground">Data Protection Officer</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-none" />
                  <div className="text-muted-foreground leading-relaxed">
                    Plot 14, Road 11, Block C, Banani, Dhaka-1213, Bangladesh
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                >
                  <span>Submit Data Request via Contact Portal</span>
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
