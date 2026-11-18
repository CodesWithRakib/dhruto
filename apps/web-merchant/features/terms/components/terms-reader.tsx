"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface LegalClause {
  title: string;
  body: string;
}

interface TermsReaderProps {
  sections: LegalClause[];
  footerNote?: string;
}

const CLAUSE_TAKEAWAYS: Record<number, string> = {
  1: "Carrier Scope: Complete end-to-end management from merchant door pickup, automated hub sorting, to final recipient handover.",
  2: "Merchant Warranties: Seller certifies accuracy of declared package contents, address coordinates, and safe internal cushioning.",
  3: "Delivery & COD Custody: Up to 3 delivery attempts per parcel. All collected physical cash is held in fiduciary escrow until scheduled settlement.",
  4: "Itemized Settlement: Platform fees and delivery charges are transparently deducted before final remittance; zero retroactive hidden markups.",
  5: "Network Safety: Strictly enforces carrier bans on hazardous goods, unlicensed narcotics, and contraband under Bangladesh penal law.",
  6: "Governance Updates: Material contractual updates are announced at least 14 days in advance via the Merchant Web Portal.",
  7: "Direct Support: 24/7 dedicated escalation channels with corporate operations desk and arbitration mechanisms.",
};

export function TermsReader({ sections, footerNote }: TermsReaderProps) {
  const [activeQuery, setActiveQuery] = useState("");
  const [activeClauseId, setActiveClauseId] = useState<number | null>(null);

  const filteredSections = useMemo(() => {
    if (!activeQuery.trim()) return sections.map((s, idx) => ({ ...s, originalIndex: idx + 1 }));
    const q = activeQuery.toLowerCase();
    return sections
      .map((s, idx) => ({ ...s, originalIndex: idx + 1 }))
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          (CLAUSE_TAKEAWAYS[s.originalIndex]?.toLowerCase().includes(q) ?? false)
      );
  }, [sections, activeQuery]);

  const scrollToClause = (idx: number) => {
    setActiveClauseId(idx);
    const element = document.getElementById(`clause-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="legal-clauses" className="relative py-24 bg-surface scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Search */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              <span>STATUTORY CLAUSES & ARTICLES</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Complete Terms of Service Agreement
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Official contractual language specifying merchant rights, carrier duties, escrow handling, and dispute resolution.
            </p>
          </div>

          {/* Controls: Search & Reading Time */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>~4 min read</span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                placeholder="Search legal articles..."
                className="w-full rounded-xl bg-field pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-field-hover focus:bg-surface"
              />
            </div>
          </div>
        </div>

        {/* Content Layout: Sticky TOC + Clauses Feed */}
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left: Sticky Table of Contents */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="rounded-2xl bg-card p-5">
              <div className="flex items-center justify-between pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <span>Articles Index</span>
                </span>
                <span>{sections.length} Clauses</span>
              </div>

              <nav className="mt-4 space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {sections.map((section, idx) => {
                  const clauseNum = idx + 1;
                  const isCurrent = activeClauseId === clauseNum;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToClause(clauseNum)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="truncate pr-2">{section.title}</span>
                      <span className="font-mono text-[11px] font-semibold opacity-70">
                        §{String(clauseNum).padStart(2, "0")}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-5 pt-4 text-[11px] text-muted-foreground leading-relaxed">
                Legally effective across all 64 districts under Bangladesh jurisdiction.
              </div>
            </div>
          </aside>

          {/* Right: Clauses Reader Cards */}
          <div className="space-y-8 lg:col-span-8">
            {filteredSections.map((section) => {
              const clauseNum = section.originalIndex;
              const takeaway = CLAUSE_TAKEAWAYS[clauseNum];

              return (
                <article
                  key={clauseNum}
                  id={`clause-${clauseNum}`}
                  className="scroll-mt-28 rounded-3xl bg-card p-6 sm:p-8 transition"
                >
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-extrabold text-primary">
                        {String(clauseNum).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Article §0{clauseNum}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Legally Enforced</span>
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-foreground sm:text-2xl">
                    {section.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {section.body}
                  </p>

                  {/* Summary Takeaway Callout */}
                  {takeaway && (
                    <div className="mt-5 rounded-2xl bg-primary/5 p-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Key Carrier Takeaway</span>
                      </div>
                      <p className="mt-1 leading-relaxed text-foreground/90">
                        {takeaway}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="rounded-3xl bg-card p-12 text-center text-sm text-muted-foreground">
                No articles matching &quot;{activeQuery}&quot;. Clear search to view all clauses.
              </div>
            )}

            {/* Footer Note */}
            {footerNote && (
              <div className="rounded-2xl bg-primary/5 p-5 text-xs text-foreground/90 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">{footerNote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
