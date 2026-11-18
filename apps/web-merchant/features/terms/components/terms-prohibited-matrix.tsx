"use client";

import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Ban,
  Box,
  CheckCircle,
  Search,
  XCircle,
} from "lucide-react";

interface CargoCategory {
  id: string;
  label: string;
  description: string;
  status: "prohibited" | "restricted" | "required";
  items: {
    name: string;
    description: string;
    complianceNote: string;
    allowed: boolean;
  }[];
}

const CARGO_CATEGORIES: CargoCategory[] = [
  {
    id: "prohibited",
    label: "Strictly Prohibited Items",
    description: "Goods that cannot be handled under any circumstance due to national laws and safety mandates.",
    status: "prohibited",
    items: [
      {
        name: "Firearms, Ammunition & Explosives",
        description: "Military or civilian weapons, fireworks, flares, gunpowder, and propellants.",
        complianceNote: "Immediate confiscation, merchant account termination, and legal reporting.",
        allowed: false,
      },
      {
        name: "Narcotics & Unregulated Controlled Substances",
        description: "Illicit drugs, substances banned by the Narcotics Control Act, prescription-only drugs without license.",
        complianceNote: "Zero tolerance. Handed directly over to law enforcement authorities.",
        allowed: false,
      },
      {
        name: "Physical Cash Currency, Bullion & Gold Bars",
        description: "Bangladeshi Taka banknotes, unminted bullion, foreign currency, and bearer instruments.",
        complianceNote: "Couriers are not cash-in-transit (CIT) armored vehicles. Declared value capped.",
        allowed: false,
      },
      {
        name: "Live Animals, Livestock & Endangered Wildlife",
        description: "Living birds, fish, domestic pets, reptile skins, or protected fauna products.",
        complianceNote: "Prohibited by Bangladesh Wildlife Preservation Act.",
        allowed: false,
      },
      {
        name: "Counterfeit & Pirated Merchandise",
        description: "Imitation luxury goods violating copyright, trademarks, or trade sanctions.",
        complianceNote: "Merchant bears 100% intellectual property liability and indemnifies carrier.",
        allowed: false,
      },
    ],
  },
  {
    id: "restricted",
    label: "Restricted Goods (Prior Approval)",
    description: "Goods permitted only with prior written declaration, special packaging, and supplementary insurance.",
    status: "restricted",
    items: [
      {
        name: "Loose High-Capacity Lithium-Ion Batteries",
        description: "Power banks, standalone battery packs exceeding 100Wh capacity.",
        complianceNote: "Must have terminal tape insulation, drop-tested rigid casing, and UN3481 labels.",
        allowed: true,
      },
      {
        name: "Cosmetics, Perfumes & Flammable Liquids",
        description: "Alcohol-based perfumes, essential oils, aerosol sprays under 500ml.",
        complianceNote: "Sealed leak-proof inner pouch + absorbent cushioning mandatory.",
        allowed: true,
      },
      {
        name: "High-Value Consumer Electronics (>50,000 BDT)",
        description: "Smartphones, laptops, DSLR lenses, premium smartwatches.",
        complianceNote: "Requires full declared value insurance and tamper-proof security tape with serial log.",
        allowed: true,
      },
      {
        name: "Perishable Dry Food & Confectionery",
        description: "Bakery goods, dry fruits, chocolates, sweets with minimum 7-day ambient shelf life.",
        complianceNote: "Allowed on same-day or next-day metro routes only; strictly excluded from standard surface 72h routing.",
        allowed: true,
      },
    ],
  },
  {
    id: "packaging",
    label: "Mandatory Packaging Protocols",
    description: "Carrier standards required to maintain eligibility for transit damage indemnity claims.",
    status: "required",
    items: [
      {
        name: "Rigid 3-Ply / 5-Ply Corrugated Cartons",
        description: "Outer shipping boxes must withstand stack pressure during transit in regional sortation cages.",
        complianceNote: "Single-wall paper bags without cushioning void damage liability.",
        allowed: true,
      },
      {
        name: "Bubble Wrap & Internal Void Fill (Min 2 Layers)",
        description: "Glassware, ceramics, cosmetics, and bottles must be wrapped individually.",
        complianceNote: "Package must pass a 1-meter free fall drop test without internal product contact.",
        allowed: true,
      },
      {
        name: "Dhruto High-Tack Thermal Shipping Label",
        description: "Barcode and QR code must be completely flat on the top face of the parcel.",
        complianceNote: "Do not place tape directly over thermal barcode lines to prevent scanner reflectivity.",
        allowed: true,
      },
      {
        name: "Tamper-Evident Security Polybag Sealing",
        description: "Plastic mailing polybags must have permanent destructive adhesive closure strips.",
        complianceNote: "Enables recipient to verify that package has not been accessed during transit.",
        allowed: true,
      },
    ],
  },
];

export function TermsProhibitedMatrix() {
  const [activeTab, setActiveTab] = useState<string>("prohibited");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentCategory = CARGO_CATEGORIES.find((c) => c.id === activeTab) ?? CARGO_CATEGORIES[0]!;

  const filteredItems = useMemo(() => {
    if (!currentCategory) return [];
    if (!searchQuery.trim()) {
      return currentCategory.items;
    }
    const q = searchQuery.toLowerCase();
    return currentCategory.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.complianceNote.toLowerCase().includes(q)
    );
  }, [currentCategory, searchQuery]);

  return (
    <section id="prohibited-cargo" className="relative py-24 bg-muted/20 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>CARGO SAFETY & COMPLIANCE MATRIX</span>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Prohibited Goods & Packaging Standards
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              To ensure rider road safety, prevent network contamination, and preserve cargo transit insurance, merchants must adhere to Dhruto item classification standards.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items or rules..."
              className="w-full rounded-xl bg-field pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-field-hover focus:bg-surface"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-10 flex flex-wrap gap-2 pb-4">
          {CARGO_CATEGORIES.map((cat) => {
            const isSelected = cat.id === activeTab;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearchQuery("");
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.status === "prohibited" && <Ban className="h-3.5 w-3.5 text-danger" />}
                {cat.status === "restricted" && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                {cat.status === "required" && <Box className="h-3.5 w-3.5 text-primary" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Intro Banner */}
        <div className="mt-6 rounded-2xl bg-card p-5 text-xs text-muted-foreground flex items-center justify-between">
          <p className="max-w-3xl leading-relaxed">
            <strong className="text-foreground">{currentCategory.label}: </strong>
            {currentCategory.description}
          </p>
          <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
            {filteredItems.length} items logged
          </span>
        </div>

        {/* Grid of Cargo Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-surface p-6 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  {item.allowed ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-danger" />
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    item.allowed
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {item.allowed ? "Allowed with SOP" : "Prohibited"}
                </span>
              </div>

              <h4 className="mt-4 text-sm font-bold text-foreground">
                {item.name}
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>

              <div className="mt-4 pt-3 text-[11px] leading-relaxed">
                <span className="font-semibold text-foreground">Carrier Protocol: </span>
                <span className="text-muted-foreground">{item.complianceNote}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="mt-12 rounded-2xl bg-card p-12 text-center text-sm text-muted-foreground">
            No items matching your search query &quot;{searchQuery}&quot;. Please consult with Dhruto Legal Affairs.
          </div>
        )}
      </div>
    </section>
  );
}
