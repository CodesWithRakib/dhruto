import * as React from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { PageHero } from "./page-hero";

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalPageProps {
  eyebrow?: string;
  title: string;
  updated?: string;
  sections: LegalSection[];
  /** Short note rendered next to the "last updated" line. */
  footerNote?: string;
}

/**
 * Shared layout for Privacy / Terms.
 * A sticky table of contents makes a long legal document scannable without
 * turning the page into a wall of identical paragraphs.
 */
export function LegalPage({ eyebrow, title, updated, sections, footerNote }: LegalPageProps) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={updated}
        align="center"
        tone="light"
      />

      <section className="py-12 sm:py-16">
        <div className="dhruto-container">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
            {/* Table of contents */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <nav
                aria-label={title}
                className="rounded-2xl border border-border/60 bg-surface/70 p-5 shadow-soft backdrop-blur-sm"
              >
                <p className="mb-3 flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  {eyebrow ? <span>{eyebrow}</span> : <span>Contents</span>}
                </p>
                <ol className="space-y-1.5 text-body-sm">
                  {sections.map((section, index) => (
                    <li key={section.title}>
                      <a
                        href={`#legal-${index + 1}`}
                        className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                      >
                        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* Document body */}
            <div className="space-y-8">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  id={`legal-${index + 1}`}
                  className="scroll-mt-28 rounded-2xl border border-border/50 bg-surface p-6 shadow-soft sm:p-8"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm font-bold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-h3 font-bold text-foreground">{section.title}</h2>
                  </div>
                  <p className="mt-3 text-body leading-relaxed text-pretty text-muted-foreground">
                    {section.body}
                  </p>
                </section>
              ))}

              {footerNote ? (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-body-sm text-foreground/90">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <p>{footerNote}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
