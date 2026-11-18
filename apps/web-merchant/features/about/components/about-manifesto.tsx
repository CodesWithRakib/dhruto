"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, History, Cpu, Globe2, Quote } from "lucide-react";
import { SectionHeading } from "@/features/marketing/components/sections";

export function AboutManifesto() {
  const t = useTranslations("About");

  const chapters = [
    {
      year: "CHAPTER 01",
      badge: "The Problem",
      icon: History,
      title: "The Fragmented Courier Era",
      text: t("paragraph1"),
      quote: "Shipping used to be a gamble. We turned it into an invariant.",
      metric: "8% Revenue Saved",
      metricLabel: "From unreconciled manual courier disputes",
    },
    {
      year: "CHAPTER 02",
      badge: "The Architecture",
      icon: Cpu,
      title: "The Digital Twin of Every Parcel",
      text: t("paragraph2"),
      quote: "One single ledger: scanned at every gateway, settled the next morning.",
      metric: "< 180ms Scan Latency",
      metricLabel: "Instant barcode decoding across all sorting belts",
    },
    {
      year: "CHAPTER 03",
      badge: "Nationwide Scale",
      icon: Globe2,
      title: "Built for All 170M Citizens",
      text: t("paragraph3"),
      quote: "Riders in Sylhet, sorters in Bogura, merchants in Dhaka: one unified protocol.",
      metric: "100% Bilingual",
      metricLabel: "Native Bangla & English for every rider and hub operator",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden" id="story">
      <div className="dhruto-container relative z-10 max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-16 items-start">
          {/* Sticky Left Column: Editorial Headline & Manifesto Anchor */}
          <div className="lg:sticky lg:top-28 space-y-6">
            <SectionHeading
              eyebrow={t("story.eyebrow")}
              title={t("story.title")}
              description={t("story.description")}
            />

            {/* Guiding Manifesto Card */}
            <div className="rounded-2xl bg-primary/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                <Quote className="h-4 w-4" />
                <span>The Dhruto Engineering Thesis</span>
              </div>
              <p className="text-sm text-foreground/90 italic leading-relaxed">
                &ldquo;Logistics in Bangladesh cannot run on phone calls and handwritten logs. If commerce is to scale 10x, every parcel must be an auditable software packet moving on high-speed physical rails.&rdquo;
              </p>
            </div>

            {/* Quick Timeline Markers */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-mono font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span>2024: Built First High-Throughput Sorting Belts in Tejgaon</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>2025: Connected All 8 Divisions via Dedicated Line-Haul Arteries</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[var(--acc)]" />
                <span>2026: Sovereign Operating System across 64 Districts</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3 Kinetic Chapter Cards */}
          <div className="space-y-6">
            {chapters.map((chap, index) => {
              const Icon = chap.icon;
              return (
                <div key={index} className="about-chapter-card group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[var(--acc)] uppercase tracking-wider">
                      <span>{chap.year}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground font-semibold">{chap.badge}</span>
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {chap.title}
                  </h3>

                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty">
                    {chap.text}
                  </p>

                  <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>{chap.metric}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {chap.metricLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
