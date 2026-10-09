"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Target, ShieldCheck, Truck, Sparkles, Activity, Lock, Compass, Globe2 } from "lucide-react";
import { Reveal } from "@/features/marketing/components/reveal";
import { SectionHeading } from "@/features/marketing/components/sections";

const PILLARS = [
  {
    icon: Target,
    watermark: Activity,
    badge: "Optical Telemetry",
    title: "Sub-Second State Updates",
    description: "Every parcel is laser-scanned at each sorting hub. State changes, route handovers, and location tags propagate instantly across the network.",
    metric: "< 180ms",
    metricLabel: "Barcode decoding latency",
  },
  {
    icon: ShieldCheck,
    watermark: Lock,
    badge: "Financial Escrow",
    title: "Next-Morning COD Settlement",
    description: "Cash collected at the doorstep is verified through rider cash-ins and settled directly into merchant bank or MFS accounts the very next morning.",
    metric: "100% Auditable",
    metricLabel: "Zero unaccounted cash discrepancies",
  },
  {
    icon: Truck,
    watermark: Compass,
    badge: "Line-Haul Fleet",
    title: "Sovereign Highway Arteries",
    description: "Daily scheduled heavy line-haul convoys connect Dhaka with all 64 districts overnight, bypassing third-party courier bottlenecks.",
    metric: "64 Districts",
    metricLabel: "Connected overnight via direct routes",
  },
  {
    icon: Sparkles,
    watermark: Globe2,
    badge: "Inclusive Tech",
    title: "Built for Bangladeshi Operators",
    description: "Full bilingual experience in Bangla and English. Engineered for riders navigating monsoons and hub workers on mobile phones.",
    metric: "Mobile-First",
    metricLabel: "Offline-resilient rider PWA application",
  },
];

export function AboutPillarsBento() {
  const t = useTranslations("About");

  return (
    <section className="py-20 sm:py-28 bg-muted/30 border-y border-border/40 relative overflow-hidden" id="pillars">
      <div className="dhruto-container relative z-10 max-w-6xl">
        <SectionHeading
          eyebrow={t("mission.eyebrow")}
          title={t("mission.title")}
          description={t("mission.description")}
          align="center"
        />

        <Reveal className="mt-14">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, index) => {
              const Icon = p.icon;
              const Watermark = p.watermark;

              return (
                <div key={index} className="about-pillar-card group">
                  {/* Decorative Watermark */}
                  <Watermark className="about-pillar-watermark" aria-hidden="true" />

                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-[var(--acc)] group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all duration-300 shadow-sm">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="rounded-full border border-border/80 bg-surface px-2.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60 flex items-baseline justify-between">
                    <div>
                      <div className="font-mono text-lg font-black text-foreground tracking-tight">
                        {p.metric}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium">
                        {p.metricLabel}
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[var(--acc)] opacity-60 group-hover:opacity-100 group-hover:animate-ping" />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
