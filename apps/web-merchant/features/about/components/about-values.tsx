"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, HeartHandshake, Compass, Languages, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/features/marketing/components/sections";
import { Reveal } from "@/features/marketing/components/reveal";

const VALUE_ICONS = [ShieldCheck, HeartHandshake, Compass, Languages];

export function AboutValues() {
  const t = useTranslations("About");
  const values = t.raw("values") as { title: string; description: string }[];

  return (
    <section className="py-20 sm:py-28 bg-muted/20 border-t border-border/40 relative overflow-hidden" id="values">
      <div className="dhruto-container relative z-10 max-w-6xl">
        <SectionHeading
          eyebrow={t("valuesEyebrow")}
          title={t("valuesTitle")}
          description={t("valuesDescription")}
          align="center"
        />

        <Reveal className="mt-14">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((val, index) => {
              const Icon = VALUE_ICONS[index] ?? ShieldCheck;
              const stepNumber = String(index + 1).padStart(2, "0");

              return (
                <div
                  key={val.title}
                  className="group relative rounded-2xl border border-border/70 bg-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-mono text-2xl font-black text-muted-foreground/40 group-hover:text-primary transition-colors">
                        {stepNumber}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {val.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {val.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span>Core Operating Invariant</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
