"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles, Truck, MapPin, Building2, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";

export function AboutHero() {
  const t = useTranslations("About");

  return (
    <section className="hero dk relative overflow-hidden pt-12 sm:pt-20 pb-20 text-center" id="about-hero">
      {/* Background Star Grid */}
      <div className="hgrid" aria-hidden="true">
        <i style={{ left: "200px", top: "80px" }} />
        <i style={{ left: "420px", top: "200px", animationDelay: "-2s" }} />
        <i style={{ left: "860px", top: "140px", animationDelay: "-3.5s" }} />
        <i style={{ left: "1040px", top: "260px", animationDelay: "-1s" }} />
      </div>

      {/* Ambient Radial Glow Orbs */}
      <div className="glow g1" aria-hidden="true" />
      <div className="glow g2" aria-hidden="true" />

      <div className="dhruto-container relative z-10 max-w-6xl mx-auto px-4">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-[var(--acc)] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t("badge")}</span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline font-mono text-[11px] text-white/70">
            EST. BANGLADESH 2024
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white max-w-4xl mx-auto leading-[1.08] text-balance">
          Engineering the Logistics Backbone for{" "}
          <em className="text-[var(--acc)] font-normal italic">170 Million People</em>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mt-6 leading-relaxed text-pretty">
          {t("lead")}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link href="/register">
            <Button
              size="lg"
              className="btn-bl h-12 px-7 rounded-xl font-bold inline-flex items-center gap-2"
            >
              {t("heroPrimary")}
              <ArrowRight className="h-4 w-4 ar" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="btn-bw h-12 px-7 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10"
            >
              {t("heroSecondary")}
            </Button>
          </Link>
        </div>

        {/* Panoramic Visual Hero Frame */}
        <div className="mt-14 max-w-5xl mx-auto relative">
          <div className="about-hero-frame p-2 sm:p-3">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-muted">
              <Image
                src="/images/hero-logistics.jpg"
                alt="Dhruto automated logistics fleet and sorting hub operations"
                fill
                sizes="(max-width: 1024px) 100vw, 1200px"
                priority
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              {/* Floating Top Telemetry Pill */}
              <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2 rounded-xl bg-black/60 px-3.5 py-1.5 font-mono text-xs text-white/90 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-success animate-ping" />
                <span>ALL 64 DISTRICT HUBS SYNCHRONIZED</span>
              </div>

              {/* Bottom Floating Stats Inside Visual */}
              <div className="absolute bottom-4 inset-x-4 sm:bottom-6 sm:inset-x-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-black/70 px-4 py-3 backdrop-blur-xl">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--acc)]/20 text-[var(--acc)]">
                    <Truck className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm sm:text-base font-extrabold text-white font-mono">
                      {t("floatingStat.value")}
                    </p>
                    <p className="text-xs text-white/70">
                      {t("floatingStat.label")}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 rounded-2xl bg-black/70 px-4 py-3 backdrop-blur-xl text-left">
                  <Activity className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">METRO NEXT-DAY</div>
                    <div className="text-[11px] text-white/60">Automated Next-Day Metro Delivery</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Ticker Below Visual */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="about-stat-pill">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xl font-mono font-black text-white">{t("stats.coverage")}</div>
                <div className="text-xs text-white/60 font-medium">{t("stats.coverageLabel")}</div>
              </div>
            </div>

            <div className="about-stat-pill">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xl font-mono font-black text-white">{t("stats.thanas")}</div>
                <div className="text-xs text-white/60 font-medium">{t("stats.thanasLabel")}</div>
              </div>
            </div>

            <div className="about-stat-pill">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xl font-mono font-black text-white">{t("stats.auditable")}</div>
                <div className="text-xs text-white/60 font-medium">{t("stats.auditableLabel")}</div>
              </div>
            </div>

            <div className="about-stat-pill">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xl font-mono font-black text-white">{t("stats.operations")}</div>
                <div className="text-xs text-white/60 font-medium">{t("stats.operationsLabel")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
