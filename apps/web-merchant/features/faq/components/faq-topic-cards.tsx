"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  Calculator,
  Compass,
  Headphones,
  PackageSearch,
  Truck,
  Zap,
} from "lucide-react";

interface FaqTopicCardsProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  openLabel?: string;
}

export function FaqTopicCards({
  eyebrow = "Browse by Specialization",
  title = "Deep-Dive Operational Portals",
  description = "Access interactive calculation models, live network telemetry, and direct operations dispatch channels.",
  openLabel = "Launch Portal",
}: FaqTopicCardsProps) {
  const topics = [
    {
      href: "/services",
      icon: Truck,
      badge: "Nationwide Transit",
      title: "Services & Line-Haul Routing",
      description:
        "Understand same-day metro express, inter-district containerized line-hauls, and tamper-evident reverse logistics.",
      stat: "64 Districts Connected",
    },
    {
      href: "/pricing",
      icon: Calculator,
      badge: "Real-Time Estimator",
      title: "Pricing & Volume Discount Curve",
      description:
        "Calculate dimensional weight rates, zero statement fees, and automated next-morning COD remittance schedules.",
      stat: "T+1 Payout SLA",
    },
    {
      href: "/track",
      icon: PackageSearch,
      badge: "Live Telemetry",
      title: "Universal Radar Tracking",
      description:
        "Instant package milestone lookup with cryptographically masked recipient details and automated delivery proof.",
      stat: "Sub-Second Updates",
    },
    {
      href: "/contact",
      icon: Headphones,
      badge: "24/7 Dispatch Desk",
      title: "Priority Operations Support",
      description:
        "Talk directly with live hub dispatch controllers, lodge cargo claims, or arrange dedicated corporate trucking routes.",
      stat: "<15 Min Response",
    },
  ];

  return (
    <section className="relative py-24 bg-muted/20 border-b border-border/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Compass className="h-3.5 w-3.5" />
            <span>{eyebrow}</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.href}
                href={topic.href}
                className="group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {topic.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {topic.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Zap className="h-3 w-3" />
                    <span>{topic.stat}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                    <span>{openLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
