"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Building2,
  CheckCircle2,
  Truck,
  Radio,
  Search,
  Navigation,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface DivisionData {
  name: string;
  bnName: string;
  districtsCount: number;
  thanasCount: number;
  sla: string;
  hubs: string[];
  districts: { name: string; bnName: string; thanas: number; sla: string }[];
}

const DIVISIONS: DivisionData[] = [
  {
    name: "Dhaka",
    bnName: "ঢাকা",
    districtsCount: 13,
    thanasCount: 142,
    sla: "12-24 Hours",
    hubs: [
      "Tejgaon Central Sort & Cross-Dock Hub",
      "Uttara Airport Gateway Hub",
      "Keraniganj South Hub",
      "Gazipur Line-Haul Sort Center",
    ],
    districts: [
      { name: "Dhaka Metro", bnName: "ঢাকা মেট্রো", thanas: 49, sla: "12-24h" },
      { name: "Gazipur", bnName: "গাজীপুর", thanas: 5, sla: "24h" },
      { name: "Narayanganj", bnName: "নারায়ণগঞ্জ", thanas: 5, sla: "24h" },
      { name: "Tangail", bnName: "টাঙ্গাইল", thanas: 12, sla: "24-36h" },
      { name: "Narsingdi", bnName: "নরসিংদী", thanas: 6, sla: "24h" },
      { name: "Faridpur", bnName: "ফরিদপুর", thanas: 9, sla: "24-36h" },
      { name: "Manikganj", bnName: "মানিকগঞ্জ", thanas: 7, sla: "24h" },
      { name: "Munshiganj", bnName: "মুন্সীগঞ্জ", thanas: 6, sla: "24h" },
      { name: "Gopalganj", bnName: "গোপালগঞ্জ", thanas: 5, sla: "24-36h" },
      { name: "Madaripur", bnName: "মাদারীপুর", thanas: 5, sla: "24-36h" },
      { name: "Rajbari", bnName: "রাজবাড়ী", thanas: 5, sla: "24-36h" },
      { name: "Shariatpur", bnName: "শরীয়তপুর", thanas: 6, sla: "24-36h" },
      { name: "Kishoreganj", bnName: "কিশোরগঞ্জ", thanas: 13, sla: "24-36h" },
    ],
  },
  {
    name: "Chittagong",
    bnName: "চট্টগ্রাম",
    districtsCount: 11,
    thanasCount: 97,
    sla: "24-36 Hours",
    hubs: [
      "Agrabad Commercial Express Hub",
      "Comilla Junction Line-Haul Hub",
      "Feni Transit Gateway",
      "Cox's Bazar Coastal Hub",
    ],
    districts: [
      { name: "Chittagong", bnName: "চট্টগ্রাম", thanas: 15, sla: "24h" },
      { name: "Cox's Bazar", bnName: "কক্সবাজার", thanas: 8, sla: "24-36h" },
      { name: "Cumilla", bnName: "কুমিল্লা", thanas: 17, sla: "24h" },
      { name: "Feni", bnName: "ফেনী", thanas: 6, sla: "24h" },
      { name: "Brahmanbaria", bnName: "ব্রাহ্মণবাড়িয়া", thanas: 9, sla: "24-36h" },
      { name: "Noakhali", bnName: "নোয়াখালী", thanas: 9, sla: "24-36h" },
      { name: "Chandpur", bnName: "চাঁদপুর", thanas: 8, sla: "24-36h" },
      { name: "Lakshmipur", bnName: "লক্ষ্মীপুর", thanas: 5, sla: "24-36h" },
      { name: "Rangamati", bnName: "রাঙ্গামাটি", thanas: 10, sla: "36-48h" },
      { name: "Khagrachhari", bnName: "খাগড়াছড়ি", thanas: 8, sla: "36-48h" },
      { name: "Bandarban", bnName: "বান্দরবান", thanas: 7, sla: "36-48h" },
    ],
  },
  {
    name: "Rajshahi",
    bnName: "রাজশাহী",
    districtsCount: 8,
    thanasCount: 67,
    sla: "24-48 Hours",
    hubs: [
      "Rajshahi City Hub",
      "Bogura Central Gateway Hub",
      "Pabna Highway Transit Center",
    ],
    districts: [
      { name: "Rajshahi", bnName: "রাজশাহী", thanas: 9, sla: "24h" },
      { name: "Bogura", bnName: "বগুড়া", thanas: 12, sla: "24h" },
      { name: "Pabna", bnName: "পাবনা", thanas: 9, sla: "24-36h" },
      { name: "Sirajganj", bnName: "সিরাজগঞ্জ", thanas: 9, sla: "24-36h" },
      { name: "Naogaon", bnName: "নওগাঁ", thanas: 11, sla: "24-36h" },
      { name: "Natore", bnName: "নাটোর", thanas: 7, sla: "24-36h" },
      { name: "Chapainawabganj", bnName: "চাঁপাইনবাবগঞ্জ", thanas: 5, sla: "36-48h" },
      { name: "Joypurhat", bnName: "জয়পুরহাট", thanas: 5, sla: "36-48h" },
    ],
  },
  {
    name: "Khulna",
    bnName: "খুলনা",
    districtsCount: 10,
    thanasCount: 59,
    sla: "24-48 Hours",
    hubs: [
      "Khulna City Terminal Hub",
      "Jashore Industrial Gateway",
      "Kushtia Regional Transit Hub",
    ],
    districts: [
      { name: "Khulna", bnName: "খুলনা", thanas: 9, sla: "24h" },
      { name: "Jashore", bnName: "যশোর", thanas: 8, sla: "24h" },
      { name: "Kushtia", bnName: "কুষ্টিয়া", thanas: 6, sla: "24-36h" },
      { name: "Satkhira", bnName: "সাতক্ষীরা", thanas: 7, sla: "24-36h" },
      { name: "Jhenaidah", bnName: "ঝিনাইদহ", thanas: 6, sla: "24-36h" },
      { name: "Bagerhat", bnName: "বাগেরহাট", thanas: 9, sla: "24-36h" },
      { name: "Chuadanga", bnName: "চুয়াডাঙ্গা", thanas: 4, sla: "36-48h" },
      { name: "Meherpur", bnName: "মেহেরপুর", thanas: 3, sla: "36-48h" },
      { name: "Narail", bnName: "নড়াইল", thanas: 3, sla: "36-48h" },
      { name: "Magura", bnName: "মাগুরা", thanas: 4, sla: "36-48h" },
    ],
  },
  {
    name: "Sylhet",
    bnName: "সিলেট",
    districtsCount: 4,
    thanasCount: 38,
    sla: "24-48 Hours",
    hubs: [
      "Zindabazar Express Sorting Hub",
      "Moulvibazar Transit Center",
      "Habiganj Gateway",
    ],
    districts: [
      { name: "Sylhet", bnName: "সিলেট", thanas: 13, sla: "24h" },
      { name: "Moulvibazar", bnName: "মৌলভীবাজার", thanas: 7, sla: "24-36h" },
      { name: "Habiganj", bnName: "হবিগঞ্জ", thanas: 9, sla: "24-36h" },
      { name: "Sunamganj", bnName: "সুনামগঞ্জ", thanas: 11, sla: "36-48h" },
    ],
  },
  {
    name: "Barisal",
    bnName: "বরিশাল",
    districtsCount: 6,
    thanasCount: 42,
    sla: "36-48 Hours",
    hubs: [
      "Barisal River Port Hub",
      "Patuakhali Coastal Station",
      "Bhola Island Terminal",
    ],
    districts: [
      { name: "Barishal", bnName: "বরিশাল", thanas: 10, sla: "24-36h" },
      { name: "Patuakhali", bnName: "পটুয়াখালী", thanas: 8, sla: "36-48h" },
      { name: "Bhola", bnName: "ভোলা", thanas: 7, sla: "36-48h" },
      { name: "Pirojpur", bnName: "পিরোজপুর", thanas: 7, sla: "36-48h" },
      { name: "Jhalokathi", bnName: "ঝালকাঠি", thanas: 4, sla: "36-48h" },
      { name: "Barguna", bnName: "বরগুনা", thanas: 6, sla: "36-48h" },
    ],
  },
  {
    name: "Rangpur",
    bnName: "রংপুর",
    districtsCount: 8,
    thanasCount: 58,
    sla: "36-48 Hours",
    hubs: [
      "Rangpur Central Transit Hub",
      "Dinajpur Northern Sort Center",
      "Bogura-Rangpur Highway Relay",
    ],
    districts: [
      { name: "Rangpur", bnName: "রংপুর", thanas: 8, sla: "24-36h" },
      { name: "Dinajpur", bnName: "দিনাজপুর", thanas: 13, sla: "36-48h" },
      { name: "Kurigram", bnName: "কুড়িগ্রাম", thanas: 9, sla: "36-48h" },
      { name: "Gaibandha", bnName: "গাইবান্ধা", thanas: 7, sla: "36-48h" },
      { name: "Nilphamari", bnName: "নীলফামারী", thanas: 6, sla: "36-48h" },
      { name: "Panchagarh", bnName: "পঞ্চগড়", thanas: 5, sla: "36-48h" },
      { name: "Thakurgaon", bnName: "ঠাকুরগাঁও", thanas: 5, sla: "36-48h" },
      { name: "Lalmonirhat", bnName: "লালমনিরহাট", thanas: 5, sla: "36-48h" },
    ],
  },
  {
    name: "Mymensingh",
    bnName: "ময়মনসিংহ",
    districtsCount: 4,
    thanasCount: 34,
    sla: "24-36 Hours",
    hubs: [
      "Mymensingh City Sort Hub",
      "Jamalpur Highway Gateway",
    ],
    districts: [
      { name: "Mymensingh", bnName: "ময়মনসিংহ", thanas: 13, sla: "24h" },
      { name: "Jamalpur", bnName: "জামালপুর", thanas: 7, sla: "24-36h" },
      { name: "Netrokona", bnName: "নেত্রকোণা", thanas: 10, sla: "24-36h" },
      { name: "Sherpur", bnName: "শেরপুর", thanas: 5, sla: "24-36h" },
    ],
  },
];

export function CoverageExplorer() {
  const [activeDivision, setActiveDivision] = useState<DivisionData>(DIVISIONS[0]!);
  const [searchQuery, setSearchQuery] = useState("");

  // Search logic: filters districts across all divisions or current division
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const results: { division: DivisionData; district: DivisionData["districts"][0] }[] = [];

    DIVISIONS.forEach((div) => {
      div.districts.forEach((dist) => {
        if (
          dist.name.toLowerCase().includes(q) ||
          dist.bnName.toLowerCase().includes(q) ||
          div.name.toLowerCase().includes(q) ||
          div.bnName.toLowerCase().includes(q)
        ) {
          results.push({ division: div, district: dist });
        }
      });
    });
    return results;
  }, [searchQuery]);

  return (
    <section id="coverage" className="relative py-20 sm:py-28 overflow-hidden bg-[var(--soft-bg)]">
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-[radial-gradient(closest-side,rgba(var(--glow-rgb),0.1),transparent)] -z-10"
        aria-hidden="true"
      />

      <div className="dhruto-container relative z-10">
        {/* Section Header with Editorial Serif highlight */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-10 sm:mb-14">
          <span className="pill">
            <Radio className="h-3.5 w-3.5 inline mr-1 animate-pulse" />
            Nationwide Line-Haul Grid
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance">
            All 64 Districts, <em className="text-[var(--acc2)] italic font-normal">495 Thanas Connected</em>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted-text)] leading-relaxed max-w-xl mx-auto text-pretty">
            Direct inter-district sorting hubs, nightly cross-dock freight runs, and dedicated last-mile couriers reaching every doorstep in Bangladesh.
          </p>
        </div>

        {/* 4 KPI Metric Strips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto mb-10">
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-center shadow-sm">
            <b className="block text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text)]">64 / 64</b>
            <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Districts (100% Reach)</span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-center shadow-sm">
            <b className="block text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text)]">495</b>
            <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Thanas &amp; Upazilas</span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-center shadow-sm">
            <b className="block text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text)]">18+</b>
            <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Automated Sorting Hubs</span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-center shadow-sm">
            <b className="block text-2xl sm:text-3xl font-extrabold font-mono text-[var(--acc2)]">24–48h</b>
            <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Nationwide Delivery SLA</span>
          </div>
        </div>

        {/* Real-Time District Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-text)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any district or thana (e.g. Bogura, Cox's Bazar, Sylhet, Gazipur)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted-text)] focus:outline-none focus:border-[var(--ink)] focus:ring-4 focus:ring-[var(--acc)]/20 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded bg-[var(--soft)] text-[var(--muted-text)] hover:text-[var(--text)] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* If Search is Active, Show Search Results Box */}
        {searchResults !== null ? (
          <div className="max-w-4xl mx-auto rounded-3xl border border-[var(--line)] bg-[var(--bg)] p-6 sm:p-8 shadow-xl mb-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                Search Results ({searchResults.length} {searchResults.length === 1 ? "district" : "districts"} found)
              </span>
              <span className="text-xs font-semibold text-[var(--ink)]">
                100% Home Delivery Available
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-text)]">
                <p className="text-base font-semibold">No direct match for &quot;{searchQuery}&quot;</p>
                <p className="text-xs mt-1">We cover all 64 districts nationwide. Try searching by major district name.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {searchResults.map(({ division, district }) => (
                  <button
                    key={`${division.name}-${district.name}`}
                    type="button"
                    onClick={() => {
                      setActiveDivision(division);
                      setSearchQuery("");
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--line)] bg-[var(--soft)]/50 hover:bg-[var(--tint)] hover:border-[var(--acc2)] text-left transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--tint-ink)]">
                        {district.name}
                      </p>
                      <p className="text-[11px] text-[var(--muted-text)]">
                        {district.bnName} • {division.name} Division
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--ink)]">
                      {district.sla}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Division Tab Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-10">
          {DIVISIONS.map((div) => {
            const isActive = activeDivision.name === div.name;
            return (
              <button
                key={div.name}
                type="button"
                onClick={() => {
                  setActiveDivision(div);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[var(--dk)] text-white shadow-lg shadow-[rgba(var(--dk-rgb),0.25)] scale-105"
                    : "border border-[var(--line)] bg-[var(--bg)] text-[var(--muted-text)] hover:bg-[var(--soft)] hover:text-[var(--text)]"
                }`}
              >
                <span>{div.name}</span>
                <span className="text-[11px] opacity-75">({div.bnName})</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-[var(--acc)] text-[var(--dk)]" : "bg-[var(--soft)] text-[var(--muted-text)]"}`}>
                  {div.districtsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Division Interactive Console */}
        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--bg)] shadow-xl p-6 sm:p-10 max-w-5xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-start">
            {/* Division Metrics & Line-Haul Route (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--tint)] text-[var(--tint-ink)] border border-[var(--acc2)]/30">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                    {activeDivision.name} Division
                  </h3>
                  <p className="text-xs font-semibold text-[var(--acc2)]">
                    {activeDivision.bnName} বিভাগ • {activeDivision.districtsCount} Districts • {activeDivision.thanasCount} Thanas
                  </p>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] text-center">
                  <p className="text-xl font-mono font-extrabold text-[var(--text)]">{activeDivision.districtsCount}</p>
                  <p className="text-[11px] text-[var(--muted-text)] font-medium">Districts</p>
                </div>
                <div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] text-center">
                  <p className="text-xl font-mono font-extrabold text-[var(--text)]">{activeDivision.thanasCount}</p>
                  <p className="text-[11px] text-[var(--muted-text)] font-medium">Thanas</p>
                </div>
                <div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] text-center">
                  <p className="text-xs font-mono font-extrabold text-[var(--acc2)] pt-1">{activeDivision.sla}</p>
                  <p className="text-[11px] text-[var(--muted-text)] font-medium">Guaranteed SLA</p>
                </div>
              </div>

              {/* Simulated Line-Haul Pipeline Flow */}
              <div className="p-4 rounded-2xl bg-[var(--soft)]/70 border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text)]">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-[var(--acc2)]" />
                    Nightly Line-Haul Route
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Nightly
                  </span>
                </div>
                <div className="text-xs text-[var(--muted-text)] flex items-center gap-1.5 font-medium">
                  <span>Dhaka Sort Hub</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--acc2)] shrink-0" />
                  <span>Regional Gateway</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--acc2)] shrink-0" />
                  <span className="font-semibold text-[var(--text)]">Doorstep Delivery</span>
                </div>
              </div>

              {/* Sorting & Line-Haul Hubs */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                  Central Sorting &amp; Gateway Hubs:
                </p>
                <div className="space-y-2">
                  {activeDivision.hubs.map((hub) => (
                    <div
                      key={hub}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--soft)]/50 text-xs font-medium text-[var(--text)]"
                    >
                      <Building2 className="h-4 w-4 text-[var(--acc2)] shrink-0" />
                      <span className="line-clamp-1">{hub}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 shrink-0">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                        Live
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Districts Grid (7 cols) */}
            <div className="lg:col-span-7 space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/40 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                  All {activeDivision.districts.length} Districts in {activeDivision.name}
                </span>
                <span className="text-xs font-mono font-bold text-[var(--acc2)] flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  100% Home Delivery
                </span>
              </div>

              {/* Interactive District Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {activeDivision.districts.map((district) => (
                  <div
                    key={district.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm hover:border-[var(--acc2)]/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[var(--text)]">{district.name}</p>
                        <p className="text-[10px] text-[var(--muted-text)]">{district.bnName} • {district.thanas} thanas</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--tint)] text-[var(--tint-ink)]">
                      {district.sla}
                    </span>
                  </div>
                ))}
              </div>

              {/* Line-Haul Schedule Note */}
              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted-text)]">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[var(--acc2)] shrink-0" />
                  <span>Nightly line-haul express dispatches departing daily at 10:00 PM</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 hidden sm:inline">
                  99.98% On-Time SLA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
