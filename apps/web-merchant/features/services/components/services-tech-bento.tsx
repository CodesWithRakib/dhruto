"use client";

import React from "react";
import {
  Check,
  Copy,
  Cpu,
  FileSpreadsheet,
  Printer,
  Webhook,
} from "lucide-react";

const CURL_SNIPPET = `curl -X POST https://api.dhruto.com/v1/shipments \\
  -H "Authorization: Bearer dhr_live_99a8x0b..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": {
      "name": "Tanvir Hasan",
      "phone": "+8801712345678",
      "address": "House 42, Road 11, Block D, Banani",
      "district": "Dhaka",
      "thana": "Banani"
    },
    "serviceTier": "SAME_DAY_EXPRESS",
    "codAmount": 2850,
    "weightKg": 1.2
  }'`;

const JSON_RESPONSE_SNIPPET = `{
  "status": "success",
  "data": {
    "trackingId": "DHR-8842-DH",
    "barcode": "884209182390",
    "status": "PICKUP_SCHEDULED",
    "serviceTier": "SAME_DAY_EXPRESS",
    "pickupWindow": "14:00 - 16:00",
    "estimatedDelivery": "2026-10-09T20:00:00+06:00",
    "codAmount": 2850,
    "deliveryCharge": 60,
    "labelUrl": "https://cdn.dhruto.com/labels/DHR-8842-DH.pdf"
  }
}`;

export function ServicesTechBento() {
  const [activeCodeTab, setActiveCodeTab] = React.useState<"curl" | "response">("curl");
  const [copied, setCopied] = React.useState<boolean>(false);

  const handleCopy = () => {
    const textToCopy = activeCodeTab === "curl" ? CURL_SNIPPET : JSON_RESPONSE_SNIPPET;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="tech-showcase" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            <span>DEVELOPER & AUTOMATION ENGINE</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Plug Nationwide Logistics Straight Into Your Codebase
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ship from your WooCommerce dashboard, Shopify storefront, custom ERP, or native mobile app using signed webhooks and sub-200ms REST endpoints.
          </p>
        </div>

        {/* Bento Grid: Left Terminal, Right Feature Cards */}
        <div className="mt-16 grid items-stretch gap-8 lg:grid-cols-12">
          {/* Left: Interactive API Code Terminal (7 cols) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#080c14] shadow-2xl lg:col-span-7">
            {/* Terminal Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-xs text-slate-400">
                  POST /api/v1/shipments
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("curl")}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition-all ${
                      activeCodeTab === "curl"
                        ? "bg-primary text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    cURL Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("response")}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition-all ${
                      activeCodeTab === "response"
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    JSON 200 OK
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/10"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-x-auto p-5 font-mono text-xs leading-relaxed text-slate-200">
              <pre className="text-slate-300">
                <code>{activeCodeTab === "curl" ? CURL_SNIPPET : JSON_RESPONSE_SNIPPET}</code>
              </pre>
            </div>

            {/* Terminal Status Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-5 py-3 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-emerald-400">Production Cluster: Active</span>
              </div>
              <div>Latency: ~142ms • TLS 1.3</div>
            </div>
          </div>

          {/* Right: 3 Automation Feature Bento Cards (5 cols) */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            {/* Card 1: Webhook Subscriptions */}
            <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Webhook className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Instant HMAC Webhooks
                  </h3>
                  <div className="text-xs text-muted-foreground">9 Real-Time Event Topics</div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Get notified the exact millisecond a parcel is scanned at a sorting belt, leaves for delivery, or reconciles cash.
              </p>
            </div>

            {/* Card 2: Bulk CSV Upload */}
            <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    High-Volume Bulk Manifests
                  </h3>
                  <div className="text-xs text-muted-foreground">5,000 Parcels in 3 Seconds</div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Upload CSV or Excel sheets with automatic Bangladeshi address parsing, district matching, and batch booking.
              </p>
            </div>

            {/* Card 3: Thermal 4x6 Labels */}
            <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Thermal 4x6 Shipping Labels
                  </h3>
                  <div className="text-xs text-muted-foreground">One-Click Print & ZPL Support</div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Standard 4x6 labels with crisp GS1-128 barcodes, recipient address details, and COD tags ready for high-speed thermal printers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
