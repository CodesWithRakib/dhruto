"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { TrackFlightDeck } from "./track-flight-deck";
import { TrackSearchCard } from "./track-search-card";

export function TrackHero() {
  const t = useTranslations("Tracking");

  return (
    <section className="hero dk relative overflow-hidden pt-12 sm:pt-20 pb-16 text-center" id="track-hero">
      {/* Background Star Grid */}
      <div className="hgrid" aria-hidden="true">
        <i style={{ left: "180px", top: "70px" }} />
        <i style={{ left: "340px", top: "180px", animationDelay: "-1.5s" }} />
        <i style={{ left: "820px", top: "120px", animationDelay: "-3s" }} />
        <i style={{ left: "980px", top: "240px", animationDelay: "-4.5s" }} />
        <i style={{ left: "1120px", top: "90px", animationDelay: "-2s" }} />
      </div>

      {/* Ambient Radial Glow Orbs */}
      <div className="glow g1" aria-hidden="true" />
      <div className="glow g2" aria-hidden="true" />

      <div className="dhruto-container relative z-10 max-w-5xl mx-auto px-4">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-[var(--acc)] mb-6 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--acc)] animate-ping" />
          <span>{t("badge")}</span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline font-mono text-[11px] text-white/70">
            RADAR PROTOCOL v4.2
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white max-w-4xl mx-auto leading-[1.08] text-balance">
          Track Every Parcel in{" "}
          <em className="text-[var(--acc)] font-normal italic">Real-Time Telemetry</em>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mt-5 leading-relaxed text-pretty">
          {t("searchSubtitle")}
        </p>

        {/* Central Search Cockpit */}
        <TrackSearchCard />

        {/* Next-Gen Telemetry Flight Deck */}
        <TrackFlightDeck />
      </div>
    </section>
  );
}
