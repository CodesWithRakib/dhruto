"use client";

import React from "react";
import {
  Clock,
  Compass,
  MapPin,
  Package,
  Phone,
} from "lucide-react";

interface RegionalHub {
  id: string;
  name: string;
  division: string;
  address: string;
  phone: string;
  manager: string;
  dailyCapacity: string;
  dropOffCutoff: string;
  operatingHours: string;
  coverageCount: string;
  status: string;
}

const REGIONAL_HUBS: RegionalHub[] = [
  {
    id: "dhaka",
    name: "Dhaka Central Cross-Dock & Sortation Facility",
    division: "Dhaka Division",
    address: "Tejgaon Light Industrial Area / Plot 14, Road 11, Banani, Dhaka-1213",
    phone: "+880 1711-DHRUTO (Central Hub Desk)",
    manager: "Shafiqul Islam (Head of Central Sorting)",
    dailyCapacity: "35,000 parcels / day",
    dropOffCutoff: "8:30 PM for Same-Night Line-Haul",
    operatingHours: "24 Hours Operational (7 Days)",
    coverageCount: "Covers all 26 Thanas in Greater Dhaka",
    status: "OPTIMAL (BELTS ONLINE)",
  },
  {
    id: "chattogram",
    name: "Chattogram Maritime & Commercial Sorting Hub",
    division: "Chattogram Division",
    address: "Agrabad Commercial Area, Badamtoli More, Chattogram-4100",
    phone: "+880 1712-DHRUTO (CTG Hub)",
    manager: "Kazi Farhan (Regional Ops Manager)",
    dailyCapacity: "18,000 parcels / day",
    dropOffCutoff: "7:30 PM Cutoff",
    operatingHours: "06:00 – 23:00 Daily",
    coverageCount: "Direct line-haul to Cox's Bazar, Feni & Comilla",
    status: "ACTIVE",
  },
  {
    id: "sylhet",
    name: "Sylhet Divisional Cross-Dock Facility",
    division: "Sylhet Division",
    address: "Subidbazar Main Road, Sylhet-3100",
    phone: "+880 1713-DHRUTO (Sylhet Hub)",
    manager: "Mizanur Rahman (Divisional Dispatch Lead)",
    dailyCapacity: "8,500 parcels / day",
    dropOffCutoff: "7:00 PM Cutoff",
    operatingHours: "07:00 – 22:00 Daily",
    coverageCount: "Covers Sylhet, Moulvibazar, Habiganj & Sunamganj",
    status: "ACTIVE",
  },
  {
    id: "rajshahi",
    name: "Rajshahi Northern Arterial Sorting Station",
    division: "Rajshahi Division",
    address: "Boalia Industrial Zone, Rajshahi-6000",
    phone: "+880 1714-DHRUTO (Rajshahi Hub)",
    manager: "Aminul Haque (Northern Fleet Supervisor)",
    dailyCapacity: "9,500 parcels / day",
    dropOffCutoff: "7:00 PM Cutoff",
    operatingHours: "07:00 – 22:00 Daily",
    coverageCount: "Arterial gateway to Bogura, Pabna & Rangpur",
    status: "ACTIVE",
  },
  {
    id: "khulna",
    name: "Khulna Southwestern Arterial Hub",
    division: "Khulna Division",
    address: "Shibbari More, KDA Commercial Area, Khulna-9100",
    phone: "+880 1715-DHRUTO (Khulna Hub)",
    manager: "Tariqul Anam (Southwestern Ops Lead)",
    dailyCapacity: "8,000 parcels / day",
    dropOffCutoff: "7:00 PM Cutoff",
    operatingHours: "07:00 – 22:00 Daily",
    coverageCount: "Serves Khulna, Jashore, Kushtia & Barishal link",
    status: "ACTIVE",
  },
];

export function ContactHubsExplorer() {
  const [activeHubId, setActiveHubId] = React.useState<string>("dhaka");
  const selectedHub = REGIONAL_HUBS.find((h) => h.id === activeHubId) ?? REGIONAL_HUBS[0]!;

  return (
    <section id="regional-hubs" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>NATIONWIDE PHYSICAL INFRASTRUCTURE</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Regional Sorting Hubs & Self Drop-off Points
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Merchants with urgent evening shipments can drop parcels directly at our central cross-dock facilities for immediate nocturnal line-haul induction.
          </p>
        </div>

        {/* Hub Tabs */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {REGIONAL_HUBS.map((hub) => {
            const isActive = activeHubId === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setActiveHubId(hub.id)}
                className={`cnt-hub-tab-btn ${isActive ? "active" : ""}`}
              >
                <span>{hub.division.split(" ")[0]} Hub</span>
              </button>
            );
          })}
        </div>

        {/* Selected Hub Detail Card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl">
          <div className="border-b border-border/60 bg-muted/40 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <span>{selectedHub.division}</span>
                  <span>•</span>
                  <span>CENTRAL SORTATION FACILITY</span>
                </div>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {selectedHub.name}
                </h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{selectedHub.status}</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* 4 Hub Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Physical Address</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground leading-relaxed">
                  {selectedHub.address}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span>Drop-Off Cutoff</span>
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {selectedHub.dropOffCutoff}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {selectedHub.operatingHours}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Package className="h-4 w-4 text-sky-500" />
                  <span>Sortation Throughput</span>
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {selectedHub.dailyCapacity}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {selectedHub.coverageCount}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Phone className="h-4 w-4 text-amber-500" />
                  <span>Hub Manager Contact</span>
                </div>
                <div className="mt-2 text-sm font-bold text-foreground">
                  {selectedHub.manager}
                </div>
                <div className="mt-1 font-mono text-xs text-primary font-semibold">
                  {selectedHub.phone}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
