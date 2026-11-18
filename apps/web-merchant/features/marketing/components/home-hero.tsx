"use client";

import React from "react";
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";
import { HeroVisual } from "@/features/marketing/components/hero-visual";

export function HomeHero() {
  return (
    <section className="hero dk relative overflow-hidden pt-12 sm:pt-20 pb-8 text-center" id="hero">
      {/* Twinkling background grid */}
      <div className="hgrid" aria-hidden="true">
        <i style={{ left: "264px", top: "88px" }} />
        <i style={{ left: "396px", top: "220px", animationDelay: "-2s" }} />
        <i style={{ left: "220px", top: "352px", animationDelay: "-4s" }} />
        <i style={{ left: "968px", top: "132px", animationDelay: "-1s" }} />
        <i style={{ left: "880px", top: "264px", animationDelay: "-3s" }} />
        <i style={{ left: "1056px", top: "308px", animationDelay: "-5s" }} />
      </div>

      {/* Ambient radial glow orbs */}
      <div className="glow g1" aria-hidden="true" />
      <div className="glow g2" aria-hidden="true" />

      <div className="dhruto-container relative z-10">
        {/* Eyebrow Pill Badge */}
        <span className="pill mb-6">
          Delivering across all 64 districts of Bangladesh
        </span>

        {/* Headline with Instrument Serif Italic Highlight */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white max-w-4xl mx-auto leading-[1.08] text-balance">
          Logistics operating system that makes your business{" "}
          <em className="text-[var(--acc)] font-normal italic">unstoppable</em>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mt-5 leading-relaxed text-pretty">
          We engineer high-speed parcel delivery, automated next-day COD settlements, and nationwide line-haul infrastructure that looks stunning, runs fast, and scales with you.
        </p>

        {/* Dual Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            href="/register"
            className="btn-bl inline-flex items-center gap-2 text-base font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            Start Shipping Now
            <ArrowRight className="h-4 w-4 ar" />
          </Link>
          <a
            href="#work"
            className="btn-bw inline-flex items-center gap-2 text-base font-semibold"
          >
            Explore Operations
            <ArrowDown className="h-4 w-4 ar" />
          </a>
        </div>

        {/* Container-Query Responsive Logistics Dashboard Mock */}
        <HeroVisual />
      </div>
    </section>
  );
}
