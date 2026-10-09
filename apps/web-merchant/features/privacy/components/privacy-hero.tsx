"use client";

import React from "react";
import {
  BookOpen,
  Database,
  EyeOff,
  FileCheck,
  Lock,
} from "lucide-react";

interface PrivacyHeroProps {
  badge?: string;
  eyebrow?: string;
  title?: string;
  updated?: string;
}

export function PrivacyHero({
  badge = "Data Sovereignty & Encryption Standards • ICT Act 2006 Compliant",
  title = "Privacy Policy & Data Sovereignty",
  updated = "Updated: October 2026 • Version 2.4",
}: PrivacyHeroProps) {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#07090e] pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Starry Mesh & Ambient Emerald/Cyan Orbs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[130px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4), rgba(14, 165, 233, 0.15), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Floating Security Beacon */}
        <div className="flex justify-center">
          <div className="prv-security-badge">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>{badge}</span>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {title ? (
              <>
                {title}{" "}
                <span className="prv-serif text-emerald-400 block sm:inline">Built on Strict Sovereignty</span>
              </>
            ) : (
              <>
                Privacy & Data Governance Built on{" "}
                <span className="prv-serif text-emerald-400">Strict Sovereignty</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            This legal specification explains in plain, verifiable terms how Dhruto secures merchant financial ledgers, cryptographically obscures recipient personal data on public tracking links, and enforces immutable audit trails.
          </p>

          <div className="mt-3 text-xs font-mono text-emerald-400/90">
            {updated}
          </div>

          {/* Jump Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollTo("#pii-demo")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover hover:shadow-primary/40 active:scale-[0.98]"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              <span>See PII Masking Live Demo</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTo("#legal-clauses")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/10"
            >
              <BookOpen className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Read Full Legal Clauses</span>
            </button>
          </div>
        </div>

        {/* 4 Cryptographic & Governance Pillars */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Lock className="h-4 w-4" />
              <span>Encryption</span>
            </div>
            <div className="mt-1.5 text-xl font-extrabold text-white">AES-256 / TLS 1.3</div>
            <div className="text-[11px] text-slate-400">At-rest & in-transit security</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <EyeOff className="h-4 w-4" />
              <span>Recipient Privacy</span>
            </div>
            <div className="mt-1.5 text-xl font-extrabold text-white">Public Masking</div>
            <div className="text-[11px] text-slate-400">Phone & address concealed</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Database className="h-4 w-4" />
              <span>Zero Monetization</span>
            </div>
            <div className="mt-1.5 text-xl font-extrabold text-white">0% Data Sale</div>
            <div className="text-[11px] text-slate-400">Never sold to marketers</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <FileCheck className="h-4 w-4" />
              <span>Audit Trail</span>
            </div>
            <div className="mt-1.5 text-xl font-extrabold text-white">100% Immutable</div>
            <div className="text-[11px] text-slate-400">Every scan cryptographically logged</div>
          </div>
        </div>
      </div>
    </section>
  );
}
