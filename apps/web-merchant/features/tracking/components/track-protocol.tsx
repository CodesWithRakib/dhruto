"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Search, Key, Compass, Lock, Copy, Check, Database, CheckCircle2, ArrowRight } from "lucide-react";
import { Reveal } from "@/features/marketing/components/reveal";
import { SectionHeading } from "@/features/marketing/components/sections";
import { useRouter } from "@/lib/navigation";

export function TrackProtocol() {
  const t = useTranslations("Tracking");
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);

  const testCode = "DHR-2610-00101";

  const handleCopyAndTest = async () => {
    try {
      await navigator.clipboard.writeText(testCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard unavailable
    }
    // Jump straight to track page with this code
    router.push(`/track/${testCode}`);
  };

  return (
    <section className="py-20 sm:py-28 bg-muted/30 border-y border-border/40 relative overflow-hidden" id="how-to-track">
      {/* Background ambient lighting */}
      <div className="dhruto-container relative z-10 max-w-6xl">
        <SectionHeading
          eyebrow={t("how.eyebrow")}
          title={t("how.title")}
          description={t("how.description")}
          align="center"
        />

        {/* 3-Phase Interactive Protocol Deck */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* Step 1: Find Code */}
          <div className="track-protocol-card group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-mono text-base font-bold shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  01
                </span>
                <span className="p-2.5 rounded-xl bg-surface-muted border border-border/50 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all">
                  <Key className="h-5 w-5" />
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                {t("how.items.0.title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t("how.items.0.description")}
              </p>
            </div>

            {/* Interactive Simulated SMS / Confirmation Snippet */}
            <div className="mt-6 pt-5 border-t border-border/60 space-y-3">
              <div className="track-sim-sms">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>SMS • DHRUTO-ALERT</span>
                  <span>Just now</span>
                </div>
                <div className="text-xs text-foreground/90 font-medium leading-relaxed">
                  Parcel booked. Tracking ID:{" "}
                  <span className="font-bold text-[var(--acc)] bg-[var(--acc)]/10 px-1 py-0.5 rounded">
                    {testCode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAndTest}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/15 text-xs font-semibold text-primary transition-all duration-200"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span>Loaded {testCode}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Try testing this sample code</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Instant Query Resolver */}
          <div className="track-protocol-card group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-mono text-base font-bold shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  02
                </span>
                <span className="p-2.5 rounded-xl bg-surface-muted border border-border/50 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all">
                  <Search className="h-5 w-5" />
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                {t("how.items.1.title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t("how.items.1.description")}
              </p>
            </div>

            {/* Interactive Query Simulator Visual */}
            <div className="mt-6 pt-5 border-t border-border/60 space-y-2.5">
              <div className="rounded-xl border border-border/70 bg-surface p-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-2 border-b border-border/40">
                  <span className="flex items-center gap-1.5 text-success">
                    <Database className="h-3 w-3" />
                    READ REPLICA CLUSTER
                  </span>
                  <span className="text-primary font-bold">&lt; 120ms</span>
                </div>
                <div className="pt-2 text-foreground/80 flex items-center justify-between">
                  <span className="truncate">GET /tracking/{testCode}</span>
                  <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-bold">
                    HTTP 200 OK
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span>Zero login or password needed</span>
              </div>
            </div>
          </div>

          {/* Step 3: Follow Live Waypoints */}
          <div className="track-protocol-card group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-mono text-base font-bold shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  03
                </span>
                <span className="p-2.5 rounded-xl bg-surface-muted border border-border/50 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all">
                  <Compass className="h-5 w-5" />
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                {t("how.items.2.title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t("how.items.2.description")}
              </p>
            </div>

            {/* Simulated Live Journey Waypoint Visual */}
            <div className="mt-6 pt-5 border-t border-border/60 space-y-2">
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate">Dhaka Central Hub Scanned</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate">Inter-District Line-Haul Transit</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="h-3.5 w-3.5 rounded-full bg-primary/20 border border-primary flex items-center justify-center shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  </span>
                  <span className="truncate">Out for Delivery with Rider</span>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Timestamped to the minute</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Privacy & Financial Isolation Guarantee */}
        <Reveal className="mt-12 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-surface to-primary/5 p-6 shadow-sm text-center sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Data Protection & Financial Privacy
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed text-pretty">
                {t("privacyNote")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
