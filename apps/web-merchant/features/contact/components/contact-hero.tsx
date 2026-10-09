"use client";

import React from "react";
import {
  Headphones,
  MapPin,
  Radio,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ContactHeroProps {
  badge?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function ContactHero({
  badge = "Live Operations Desk • Nationwide 24/7 Dispatch",
  title = "Direct Lines to the Dhruto Operations Desk",
  description = "Connect directly with our territory dispatchers, corporate onboarding specialists, and API integrations engineers. Zero automated chatbots — real human logistics operators.",
}: ContactHeroProps) {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#07090e] pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Starry Mesh & Dual Ambient Glow Orbs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-35 blur-[130px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255, 107, 0, 0.4), rgba(16, 185, 129, 0.2), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Live Pulsing Operational Badge */}
        <div className="flex justify-center">
          <div className="cnt-live-badge">
            <span className="cnt-pulse-dot" />
            <span>{badge}</span>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {title ? (
              <>
                {title}{" "}
                <span className="cnt-serif text-primary block sm:inline">24/7 Human Dispatch</span>
              </>
            ) : (
              <>
                Direct Lines to the{" "}
                <span className="cnt-serif text-primary">Dhruto Operations Desk</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {description}
          </p>

          {/* Jump Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollTo("#dispatch-form")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover hover:shadow-primary/40 active:scale-[0.98]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Compose Dispatch Inquiry</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTo("#regional-hubs")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/10"
            >
              <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Explore 64 District Hubs</span>
            </button>
          </div>
        </div>

        {/* Live Operational Health Status Strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Zap className="h-4 w-4" />
              <span>First Response SLA</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">&lt; 18 Mins</div>
            <div className="text-[11px] text-slate-400">During active dispatch hours</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Headphones className="h-4 w-4" />
              <span>Operations Desk</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">24/7 Monitored</div>
            <div className="text-[11px] text-slate-400">Night line-haul telemetry</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Radio className="h-4 w-4" />
              <span>Emergency Escalation</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">Direct Line</div>
            <div className="text-[11px] text-slate-400">Immediate rider contact</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Resolution Rate</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">99.2%</div>
            <div className="text-[11px] text-slate-400">Same-shift resolution</div>
          </div>
        </div>
      </div>
    </section>
  );
}
