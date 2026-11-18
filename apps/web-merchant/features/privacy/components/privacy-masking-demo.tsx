"use client";

import React from "react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export function PrivacyMaskingDemo() {
  const [viewMode, setViewMode] = React.useState<"public" | "internal">("public");

  return (
    <section id="pii-demo" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>LIVE PII MASKING SPECIFICATION</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            See How Customer Privacy is Protected on Public Tracking Links
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Traditional couriers leave full customer phone numbers and home addresses exposed to anyone with a tracking code. Dhruto cryptographically redacts sensitive personal data on all public surfaces.
          </p>
        </div>

        {/* Interactive View Switcher Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-2xl bg-muted/40 p-1.5">
            <button
              type="button"
              onClick={() => setViewMode("public")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                viewMode === "public"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Public Tracking View (Default)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("internal")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                viewMode === "internal"
                  ? "bg-success text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Merchant Authenticated Portal View</span>
            </button>
          </div>
        </div>

        {/* Simulated Parcel Comparison Card */}
        <div className="mt-10 mx-auto max-w-4xl">
          <div className="prv-mask-card">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-success" />
                <span className="font-mono text-xs font-bold text-foreground">
                  PARCEL #DHR-8842-DH • IN TRANSIT
                </span>
              </div>
              <div className="mt-2 sm:mt-0">
                {viewMode === "public" ? (
                  <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                    PROTECTED PUBLIC VIEW (ZERO LEAKS)
                  </span>
                ) : (
                  <span className="rounded-full bg-warning/15 px-3 py-1 text-[11px] font-bold text-warning">
                    MERCHANT AUTHENTICATED INTERNAL
                  </span>
                )}
              </div>
            </div>

            {/* Field Rows */}
            <div className="mt-6 space-y-3.5 font-mono text-xs sm:text-sm">
              <div className="flex flex-col justify-between rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center">
                <span className="text-muted-foreground">Recipient Name</span>
                <span className="font-bold text-foreground mt-1 sm:mt-0">
                  {viewMode === "public" ? (
                    <span className="text-success">
                      Tanvir H*** <span className="text-[10px] text-muted-foreground font-sans">(Surname obscured)</span>
                    </span>
                  ) : (
                    <span>Tanvir Hasan</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center">
                <span className="text-muted-foreground">Mobile Phone Number</span>
                <span className="font-bold text-foreground mt-1 sm:mt-0">
                  {viewMode === "public" ? (
                    <span className="text-success">
                      +880 17***-**78 <span className="text-[10px] text-muted-foreground font-sans">(Digit-masked)</span>
                    </span>
                  ) : (
                    <span>+880 1712-345678</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center">
                <span className="text-muted-foreground">Doorstep Delivery Address</span>
                <span className="font-bold text-foreground mt-1 sm:mt-0">
                  {viewMode === "public" ? (
                    <span className="text-success">
                      Banani, Dhaka <span className="text-[10px] text-muted-foreground font-sans">(House & Flat masked)</span>
                    </span>
                  ) : (
                    <span>House 42, Road 11, Block D, Banani, Dhaka</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center">
                <span className="text-muted-foreground">Order Value & COD Amount</span>
                <span className="font-bold text-foreground mt-1 sm:mt-0">
                  {viewMode === "public" ? (
                    <span className="text-success">
                      Hidden <span className="text-[10px] text-muted-foreground font-sans">(Theft & extortion prevention)</span>
                    </span>
                  ) : (
                    <span>৳3,850 (Cash on Delivery)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>Audited under Bangladesh Information & Communication Technology (ICT) Act</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                SHA-256 HMAC Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
