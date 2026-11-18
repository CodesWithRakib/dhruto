"use client";

import React from "react";
import {
  Barcode,
  CheckCircle2,
  Code2,
  Coins,
  Globe2,
  ShieldCheck,
} from "lucide-react";

interface GuaranteeItem {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const GUARANTEE_ITEMS: GuaranteeItem[] = [
  {
    number: "01",
    title: "Scanned at Every Hop",
    description:
      "Every physical handoff — from merchant pickup, cross-dock belt sorting, bag sealing to doorstep delivery — is validated with a physical barcode scan. Zero estimations.",
    icon: Barcode,
    tag: "Physical Audit Trail",
  },
  {
    number: "02",
    title: "100% Transparent Fee Ledger",
    description:
      "Delivery charges, weight tiers, and cash collection fees are displayed before you click book. What you see is exactly what is settled to your wallet — 0 hidden deductions.",
    icon: Coins,
    tag: "Zero-Deduction Guarantee",
  },
  {
    number: "03",
    title: "Bilingual Operating System",
    description:
      "Engineered natively for Bangladesh. From recipient SMS tracking notifications to rider delivery manifests, every interface works seamlessly in both English and বাংলা.",
    icon: Globe2,
    tag: "Bangla & English Native",
  },
  {
    number: "04",
    title: "API-First Infrastructure",
    description:
      "Everything accessible in our dashboard is powered by the same public REST API and webhook architecture available to your software engineering and logistics teams.",
    icon: Code2,
    tag: "REST API & signed webhooks",
  },
];

interface ServicesGuaranteesProps {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function ServicesGuarantees({
  eyebrow = "SERVICE STANDARDS",
  title = "Four Commitments Behind Every Single Shipment",
  description = "The exact same engineering rigor and financial transparency apply whether you dispatch one parcel a week or fifty thousand a day.",
}: ServicesGuaranteesProps) {
  return (
    <section className="relative py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xl font-extrabold text-muted-foreground/40 group-hover:text-primary/70 transition-colors">
                      {item.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{item.tag}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
