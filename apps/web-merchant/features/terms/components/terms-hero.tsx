"use client";

import React from "react";
import {
  FileCheck2,
  ShieldCheck,
  Scale,
  Clock,
  Sparkles,
  ArrowDown,
  Lock,
} from "lucide-react";

interface TermsHeroProps {
  eyebrow?: string;
  title?: string;
  updated?: string;
}

export function TermsHero({
  eyebrow = "Contractual SLA & Carrier Governance",
  title = "Terms of Service & Merchant SLA Agreement",
  updated = "These legally binding terms govern all logistics operations, COD collections, and digital portal services across Bangladesh.",
}: TermsHeroProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#07090f] pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Subtle Star Grid & Ambient Emerald Aura */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[580px] w-[950px] -translate-x-1/2 rounded-full opacity-30 blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.2) 50%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Status Beacon Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 text-xs text-slate-400">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-emerald-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>LEGAL REVISION v2.4 • ACTIVELY ENFORCED</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Scale className="h-3.5 w-3.5 text-emerald-400" />
              <span>Dhaka Jurisdiction & ICT Act</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bank-Audited Escrow</span>
            </span>
          </div>
        </div>

        {/* Hero Title & Body */}
        <div className="mt-12 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{eyebrow}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100">
            {title}{" "}
            <span className="block font-serif italic font-normal text-emerald-400 mt-1">
              Governed by Complete Accountability.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-300 max-w-3xl">
            {updated}
          </p>

          {/* Quick Jump Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollTo("sla-commitments")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>View SLA Commitments</span>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo("prohibited-cargo")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
            >
              <span>Prohibited Goods Guide</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTo("legal-clauses")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
            >
              <span>Full Articles (§01–§07)</span>
            </button>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">T+1 Auto Remittance</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              COD funds collected by delivery personnel are reconciled same-day and transferred to your bank or MFS account next morning.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">100% Escrow Protection</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Every package is insured against verified loss, theft, or in-transit transit damage up to the declared merchant product value.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">Zero Hidden Charges</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Fixed, upfront pricing with no secret platform subscription fees, retroactive fuel adjustments, or portal withdrawal penalties.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Scale className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">Statutory Governance</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Enforceable under the Arbitration Act of 2001 and Bangladesh commercial laws, with dedicated dispute resolution escalation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
