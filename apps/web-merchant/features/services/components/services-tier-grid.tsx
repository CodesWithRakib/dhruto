"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Check,
  RotateCcw,
  Search,
  Sparkles,
  Truck,
  Workflow,
  Zap,
} from "lucide-react";

interface ServicesTierGridProps {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function ServicesTierGrid({
  eyebrow = "What We Ship & Operate",
  title = "One Unified Operating System for Every Delivery Need",
  description = "Whether dispatching urgent 4-hour intra-city documents, managing high-volume fashion orders, or moving pallets to remote Upazilas — each parcel runs on the exact same scanned, trackable state machine.",
}: ServicesTierGridProps) {
  return (
    <section id="services-grid" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        {/* Bento Cards Grid */}
        <div className="srv-cards-grid mt-16">
          {/* Card 1: Featured Hero Service (Spans 2 rows on desktop) */}
          <div className="srv-card feat">
            <div className="relative z-10 flex flex-col h-full">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/20 text-primary">
                <Zap className="h-6 w-6" aria-hidden="true" />
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold tracking-wide text-primary">
                  HIGH VELOCITY
                </span>
                <span className="text-xs text-slate-400">Intra-City Dhaka & Metro</span>
              </div>

              <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Same-Day & Express Velocity
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Engineered for rapid e-commerce sellers, dark stores, and time-critical medical supplies. Parcels picked up during morning and midday windows are delivered to the recipient’s doorstep on the exact same day.
              </p>

              <ul className="mt-6 space-y-3.5 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span><strong>3 Scheduled Pickup Batches:</strong> Morning (10 AM), Noon (2 PM), and Express Cutoff (6 PM).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span><strong>Optical Doorstep Scan:</strong> Instant SMS notification triggered the moment rider collects parcel.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span><strong>Bottleneck-Bypass Routing:</strong> Algorithmic rider dispatches that avoid Dhaka gridlock corridors.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span><strong>Geotagged Proof of Delivery:</strong> Photographic signature and timestamp recorded at handoff.</span>
                </li>
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Book Express Deliveries</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Nationwide Line-Haul */}
          <div className="srv-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
              Nationwide 64-District Line-Haul
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Direct highway line-haul arteries connecting Dhaka to every divisional hub and remote Upazila without intermediated third parties.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 pt-2">
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                All 64 Districts
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                48-72h Nationwide SLA
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Numbered Tamper Seals
              </span>
            </div>
          </div>

          {/* Card 3: COD & Financial Escrow */}
          <div className="srv-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
              Automated COD Escrow & Wallet
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Doorstep cash collection verified at local hubs with automated next-morning disbursement directly to bKash, Nagad, Rocket, or your company bank account.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 pt-2">
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Next-Morning Payout
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                0% Hidden Surcharges
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Downloadable Statements
              </span>
            </div>
          </div>

          {/* Card 4: Parcel Tracking & Visibility */}
          <div className="srv-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
              Sub-Second Parcel Tracking
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Zero-friction public tracking links with bilingual status timelines (English & Bangla) so your customers never have to call support asking &apos;Where is my package?&apos;.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 pt-2">
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Bilingual EN / BN
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Instant SMS Alerts
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Live Geofence Telemetry
              </span>
            </div>
          </div>

          {/* Card 5: Returns & RTO Intelligence */}
          <div className="srv-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
              RTO & Delivery Fraud Shield
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Parcels never disappear into a courier black hole. 3 verified delivery attempts with documented recipient reason codes before return-to-origin is approved.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 pt-2">
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                3-Attempt Protocol
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Audited Reason Codes
              </span>
              <span className="rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                Express Return Routing
              </span>
            </div>
          </div>

          {/* Card 6: Wide Bento Card (Spans across bottom) */}
          <div className="srv-card wide">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Workflow className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  DEVELOPER & ENTERPRISE
                </span>
                <span className="text-xs text-muted-foreground">High-Throughput Automation</span>
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                Cross-Dock Hub Sortation & Developer REST API
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Optical barcode sortation belts processing 12,000 parcels per hour. Plug directly into your ERP, Shopify store, or WooCommerce site via signed webhook subscriptions and low-latency REST endpoints.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <span className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                REST API
              </span>
              <span className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                HMAC Webhooks
              </span>
              <span className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                WooCommerce
              </span>
              <span className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                Thermal 4x6 ZPL
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
