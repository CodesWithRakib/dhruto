"use client";

import React from "react";
import {
  HelpCircle,
  Search,
  Headphones,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface FaqHeroProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeCategory: string;
  onCategorySelect: (cat: string) => void;
  categories: { id: string; label: string; count: number }[];
}

export function FaqHero({
  eyebrow = "Help & Knowledge Base",
  title = "Frequently Asked Questions",
  description = "Everything you need to know about parcel booking, express pickup, next-morning COD payouts, automated tracking, and developer APIs with Dhruto.",
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategorySelect,
  categories,
}: FaqHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#07090f] pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Subtle Star Grid & Emerald/Cyan Ambient Glow */}
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
            "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 text-xs text-slate-400">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-emerald-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>24/7 MERCHANT KNOWLEDGE SYSTEM • v3.1 LIVE</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Avg Helpdesk SLA: 12 Mins</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-300">
              <Headphones className="h-3.5 w-3.5 text-emerald-400" />
              <span>Direct Phone & WhatsApp</span>
            </span>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="mt-12 max-w-3xl text-left">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300 backdrop-blur-sm">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{eyebrow}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100">
            {title}{" "}
            <span className="block font-serif italic font-normal text-emerald-400 mt-1">
              Answers Engineered for Instant Clarity.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-300">
            {description}
          </p>

          {/* Interactive Fast-Search Input */}
          <div className="mt-8 relative max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search questions (e.g. 'COD payout schedule', 'RTO fee', 'API keys', 'damaged parcel')..."
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white/15 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-xl backdrop-blur-md transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-4 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Category Jump Pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Filter by:</span>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategorySelect(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                    isSelected ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-slate-400"
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Trust Metrics */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">&lt;15 Min Support SLA</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Fast resolution via live operations desk, WhatsApp dispatch channel, and ticketing.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">T+1 Automated COD</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Every Taka collected by couriers is reconciled same-day and wired next morning.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">64 Districts & 495 Thanas</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Dedicated line-haul truck routes connecting every metropolitan and rural corner.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-white/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-white">100% In-Transit Escrow</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Declared merchandise value fully indemnified with fast-track 72h digital claims.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
