"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";

interface LegalClause {
  title: string;
  body: string;
  takeaway?: string;
}

interface PrivacyReaderProps {
  sections: LegalClause[];
  footerNote?: string;
}

const DEFAULT_TAKEAWAYS: Record<number, string> = {
  0: "Key Takeaway: We strictly collect operational delivery coordinates, recipient phone numbers, and package dimensions. We do not track invasive device telemetry.",
  1: "Key Takeaway: Personal data is exclusively utilized to route, deliver, and reconcile cash on delivery. Dhruto never sells or rents your merchant data.",
  2: "Key Takeaway: Public tracking links deliberately mask recipient phone numbers, home addresses, and financial amounts to eliminate data leaks.",
  3: "Key Takeaway: Information is only transferred to bonded hub sorters, assigned riders, and regulated payment gateways (bKash/Banks) necessary to complete dispatch.",
  4: "Key Takeaway: All communications run over TLS 1.3, databases use AES-256 at-rest encryption, and staff access is governed by strict role-based access control (RBAC).",
  5: "Key Takeaway: You own your business data. Merchants can export comprehensive parcel histories or request permanent customer PII pseudonymization at any time.",
};

export function PrivacyReader({ sections, footerNote }: PrivacyReaderProps) {
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredSections = sections.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="legal-clauses" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>FULL LEGAL ARTICLES & CLAUSES</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Detailed Data Protection Articles
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Use the index on the left to navigate clauses or search for specific terms such as &apos;Recipient&apos;, &apos;Security&apos;, or &apos;Sharing&apos;.
          </p>
        </div>

        {/* Reader Layout: Sticky Index (4 cols) & Clauses (8 cols) */}
        <div className="mt-16 grid items-start gap-10 lg:grid-cols-12">
          {/* Left Sticky Table of Contents */}
          <aside className="lg:col-span-4">
            <div className="prv-toc-sticky space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Policy Table of Contents</span>
              </div>

              {/* Quick Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter clauses..."
                  className="w-full rounded-xl border border-border/80 bg-muted/40 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Clause Links */}
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#clause-${index + 1}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <span className="truncate">{section.title}</span>
                    <span className="font-mono text-[11px] text-muted-foreground/60 pl-2">
                      §{String(index + 1).padStart(2, "0")}
                    </span>
                  </a>
                ))}
              </nav>

              <div className="border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
                Estimated Reading Time: <strong>~4 minutes</strong>
              </div>
            </div>
          </aside>

          {/* Right Document Clauses */}
          <div className="space-y-8 lg:col-span-8">
            {filteredSections.map((section) => {
              const originalIndex = sections.findIndex((s) => s.title === section.title);
              const takeaway = DEFAULT_TAKEAWAYS[originalIndex] ?? DEFAULT_TAKEAWAYS[0];

              return (
                <div
                  key={section.title}
                  id={`clause-${originalIndex + 1}`}
                  className="prv-clause-card scroll-mt-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                      ARTICLE {String(originalIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      LEGAL SPECIFICATION
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                    {section.title}
                  </h3>

                  <div className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {section.body}
                  </div>

                  {/* Summary Takeaway Callout */}
                  {takeaway && (
                    <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {takeaway}
                    </div>
                  )}
                </div>
              );
            })}

            {footerNote && (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-xs text-foreground/90">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <p>{footerNote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
