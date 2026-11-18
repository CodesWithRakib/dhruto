"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Radio, Route, Building2, ShieldCheck, Lock, Activity, Cpu } from "lucide-react";
import { Reveal } from "@/features/marketing/components/reveal";
import { SectionHeading } from "@/features/marketing/components/sections";

const BENTO_FEATURES = [
  {
    icon: Radio,
    watermark: Activity,
    badge: "Sub-Second Inbound",
    titleKey: "items.0.title",
    descKey: "items.0.description",
    metric: "< 240ms",
    metricLabel: "Average Hub Scan Latency",
  },
  {
    icon: Route,
    watermark: Route,
    badge: "Milestone Telemetry",
    titleKey: "items.1.title",
    descKey: "items.1.description",
    metric: "100%",
    metricLabel: "Timestamp Event Verification",
  },
  {
    icon: Building2,
    watermark: Cpu,
    badge: "Automated Routing",
    titleKey: "items.2.title",
    descKey: "items.2.description",
    metric: "64 / 64",
    metricLabel: "Districts Connected Overnight",
  },
  {
    icon: ShieldCheck,
    watermark: Lock,
    badge: "Cryptographic Privacy",
    titleKey: "items.3.title",
    descKey: "items.3.description",
    metric: "Zero Leak",
    metricLabel: "Masked Recipient Security",
  },
];

export function TrackFeaturesBento() {
  const t = useTranslations("Tracking");

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="dhruto-container relative z-10">
        <SectionHeading
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          description={t("features.description")}
          align="center"
        />

        <Reveal className="mt-14">
          <div className="track-bento-grid">
            {BENTO_FEATURES.map((item, index) => {
              const Icon = item.icon;
              const Watermark = item.watermark;
              const title = t(`features.${item.titleKey}` as Parameters<typeof t>[0]);
              const desc = t(`features.${item.descKey}` as Parameters<typeof t>[0]);

              return (
                <div key={index} className="track-bento-card group flex flex-col justify-between">
                  {/* Decorative Watermark */}
                  <Watermark className="track-bento-watermark" aria-hidden="true" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-[var(--acc)] group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-105">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 flex items-baseline justify-between">
                    <div>
                      <div className="font-mono text-lg font-extrabold text-foreground tracking-tight">
                        {item.metric}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium">
                        {item.metricLabel}
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
