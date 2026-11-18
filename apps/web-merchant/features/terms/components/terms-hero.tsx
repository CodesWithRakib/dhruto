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
    <section className="relative overflow-hidden bg-inverse pb-20 pt-28 text-white md:pb-28 md:pt-36">
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
            "radial-gradient(circle, hsl(var(--success) / 0.45) 0%, hsl(var(--success) / 0.2) 50%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Status Beacon Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3.5 py-1 text-success font-mono text-[11px] font-semibold tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span>LEGAL REVISION v2.4 • ACTIVELY ENFORCED</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-inverse-muted">
              <Scale className="h-3.5 w-3.5 text-success" />
              <span>Dhaka Jurisdiction & ICT Act</span>
            </span>
            <span className="hidden sm:inline text-muted-foreground">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-inverse-muted">
              <Lock className="h-3.5 w-3.5 text-success" />
              <span>Bank-Audited Escrow</span>
            </span>
          </div>
        </div>

        {/* Hero Title & Body */}
        <div className="mt-12 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-success backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{eyebrow}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-inverse-foreground">
            {title}{" "}
            <span className="block font-serif italic font-normal text-success mt-1">
              Governed by Complete Accountability.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-inverse-muted max-w-3xl">
            {updated}
          </p>

          {/* Quick Jump Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollTo("sla-commitments")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-inverse transition hover:bg-primary-soft"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>View SLA Commitments</span>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo("prohibited-cargo")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              <span>Prohibited Goods Guide</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTo("legal-clauses")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              <span>Full Articles (§01–§07)</span>
            </button>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm transition hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">T+1 Auto Remittance</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              COD funds collected by delivery personnel are reconciled same-day and transferred to your bank or MFS account next morning.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm transition hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">100% Escrow Protection</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Every package is insured against verified loss, theft, or in-transit transit damage up to the declared merchant product value.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm transition hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">Zero Hidden Charges</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Fixed, upfront pricing with no secret platform subscription fees, retroactive fuel adjustments, or portal withdrawal penalties.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm transition hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <Scale className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">Statutory Governance</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Enforceable under the Arbitration Act of 2001 and Bangladesh commercial laws, with dedicated dispute resolution escalation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
