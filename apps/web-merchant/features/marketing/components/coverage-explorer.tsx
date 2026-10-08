"use client";

import React, { useState } from "react";
import { MapPin, Building2, CheckCircle2, Truck, Radio } from "lucide-react";

interface DivisionData {
  name: string;
  bnName: string;
  districtsCount: number;
  thanasCount: number;
  sla: string;
  hubs: string[];
  keyDistricts: string[];
}

const DIVISIONS: DivisionData[] = [
  {
    name: "Dhaka",
    bnName: "ঢাকা",
    districtsCount: 13,
    thanasCount: 142,
    sla: "12-24 Hours",
    hubs: ["Tejgaon Central Sort Hub", "Uttara Hub", "Keraniganj Express Hub", "Gazipur Line-haul Hub"],
    keyDistricts: ["Dhaka Metro", "Gazipur", "Narayanganj", "Tangail", "Narsingdi", "Faridpur", "Manikganj"],
  },
  {
    name: "Chittagong",
    bnName: "চট্টগ্রাম",
    districtsCount: 11,
    thanasCount: 97,
    sla: "24-36 Hours",
    hubs: ["Agrabad Commercial Hub", "Comilla Junction Hub", "Feni Line-haul Hub"],
    keyDistricts: ["Chittagong Port", "Cox's Bazar", "Cumilla", "Feni", "Brahmanbaria", "Noakhali"],
  },
  {
    name: "Sylhet",
    bnName: "সিলেট",
    districtsCount: 4,
    thanasCount: 38,
    sla: "24-48 Hours",
    hubs: ["Zindabazar Hub", "Moulvibazar Transit Center"],
    keyDistricts: ["Sylhet Sadar", "Moulvibazar", "Habiganj", "Sunamganj"],
  },
  {
    name: "Rajshahi",
    bnName: "রাজশাহী",
    districtsCount: 8,
    thanasCount: 67,
    sla: "24-48 Hours",
    hubs: ["Rajshahi City Hub", "Bogra Central Hub"],
    keyDistricts: ["Rajshahi", "Bogura", "Pabna", "Sirajganj", "Naogaon", "Natore"],
  },
  {
    name: "Khulna",
    bnName: "খুলনা",
    districtsCount: 10,
    thanasCount: 59,
    sla: "24-48 Hours",
    hubs: ["Khulna City Hub", "Jessore Industrial Hub"],
    keyDistricts: ["Khulna", "Jashore", "Kushtia", "Satkhira", "Jhenaidah", "Bagerhat"],
  },
  {
    name: "Barisal",
    bnName: "বরিশাল",
    districtsCount: 6,
    thanasCount: 42,
    sla: "36-48 Hours",
    hubs: ["Barisal River Hub", "Patuakhali Coastal Station"],
    keyDistricts: ["Barishal", "Patuakhali", "Bhola", "Pirojpur", "Jhalokathi", "Barguna"],
  },
  {
    name: "Rangpur",
    bnName: "রংপুর",
    districtsCount: 8,
    thanasCount: 58,
    sla: "36-48 Hours",
    hubs: ["Rangpur Hub", "Dinajpur Frontier Hub"],
    keyDistricts: ["Rangpur", "Dinajpur", "Thakurgaon", "Gaibandha", "Kurigram"],
  },
  {
    name: "Mymensingh",
    bnName: "ময়মনসিংহ",
    districtsCount: 4,
    thanasCount: 34,
    sla: "24-36 Hours",
    hubs: ["Mymensingh City Hub", "Jamalpur Gateway"],
    keyDistricts: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
  },
];

export function CoverageExplorer() {
  const [activeDivision, setActiveDivision] = useState<DivisionData>(DIVISIONS[0]!);

  return (
    <section id="coverage" className="relative py-16 sm:py-24 overflow-hidden">
      <div className="dhruto-container relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Nationwide Line-Haul Grid</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-balance">
            All 64 Districts, 495 Thanas Connected
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
            From Dhaka city center to remote coastal upazilas, our proprietary routing algorithms and dedicated fleet deliver your parcels reliably.
          </p>
        </div>

        {/* Division Tab Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-10">
          {DIVISIONS.map((div) => {
            const isActive = activeDivision.name === div.name;
            return (
              <button
                key={div.name}
                type="button"
                onClick={() => setActiveDivision(div)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "border border-border/60 bg-surface/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span>{div.name}</span>
                <span className="text-[11px] opacity-75">({div.bnName})</span>
              </button>
            );
          })}
        </div>

        {/* Active Division Card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-center">
            {/* Division Metrics (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground border border-primary/20">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {activeDivision.name} Division
                  </h3>
                  <p className="text-xs font-semibold text-primary">{activeDivision.bnName} বিভাগ</p>
                </div>
              </div>

              {/* Stat badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl border border-border bg-surface-muted/60 text-center">
                  <p className="text-xl font-mono font-extrabold text-foreground">{activeDivision.districtsCount}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Districts</p>
                </div>
                <div className="p-3 rounded-2xl border border-border bg-surface-muted/60 text-center">
                  <p className="text-xl font-mono font-extrabold text-foreground">{activeDivision.thanasCount}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Thanas</p>
                </div>
                <div className="p-3 rounded-2xl border border-border bg-surface-muted/60 text-center">
                  <p className="text-xs font-mono font-extrabold text-primary pt-1">{activeDivision.sla}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Average SLA</p>
                </div>
              </div>

              {/* Sorting Hubs */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Sorting & Gateway Hubs:
                </p>
                <div className="space-y-2">
                  {activeDivision.hubs.map((hub) => (
                    <div
                      key={hub}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-surface-muted/40 text-xs font-medium text-foreground"
                    >
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{hub}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-success-soft-foreground">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
                        Live
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Districts Grid (7 cols) */}
            <div className="lg:col-span-7 space-y-4 rounded-2xl border border-border bg-surface-muted/30 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Key Coverage Areas & Upazilas
                </span>
                <span className="text-xs font-mono font-bold text-primary">
                  100% Home Delivery
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {activeDivision.keyDistricts.map((district) => (
                  <span
                    key={district}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>{district}</span>
                  </span>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Dedicated daily line-haul trucks between Dhaka and {activeDivision.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
