"use client";

import React, { useState } from "react";
import {
  Sparkles,
  MapPin,
  ShieldAlert,
  Cpu,
  Zap,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { SmartAddressParser } from "../../../features/intelligence/components/smart-address-parser";
import { RtoRiskMeter } from "../../../features/intelligence/components/rto-risk-meter";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState<"both" | "address" | "risk">("both");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Dhruto Cognitive Intelligence Engine v2.0
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Logistics AI & RTO Prediction Suite
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Bilingual natural language address parsing, phonetic typo correction, and pre-dispatch customer risk assessment for Bangladesh e-commerce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/bookings/new">
            <Button className="flex items-center gap-2 shadow-sm">
              <Zap className="h-4 w-4" />
              Book With AI Auto-Fill
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>District Coverage</span>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">64 / 64</div>
          <p className="text-xs text-muted-foreground">All Bangladesh divisions & hubs</p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Thana Lexicon</span>
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">150+</div>
          <p className="text-xs text-muted-foreground">With postal code matching</p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>RTO Loss Reduction</span>
            <TrendingDown className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">~38%</div>
          <p className="text-xs text-muted-foreground">Through pre-dispatch phone audit</p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Carrier Validation</span>
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">100%</div>
          <p className="text-xs text-muted-foreground">GP, Robi, BL, Teletalk detection</p>
        </div>
      </div>

      {/* View Switcher on Small Screens */}
      <div className="flex md:hidden items-center justify-center p-1 bg-muted rounded-lg max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab("both")}
          className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all ${activeTab === "both" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          All Tools
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all ${activeTab === "address" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          Address NLP
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("risk")}
          className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all ${activeTab === "risk" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          RTO Predictor
        </button>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {(activeTab === "both" || activeTab === "address") && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-foreground">
                NLP Address Parsing Engine
              </h2>
            </div>
            <SmartAddressParser />
          </div>
        )}

        {(activeTab === "both" || activeTab === "risk") && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <h2 className="text-base font-bold text-foreground">
                Recipient Risk & RTO Radar
              </h2>
            </div>
            <RtoRiskMeter />
          </div>
        )}
      </div>

      {/* Banner / Developer Docs Note */}
      <div className="p-6 rounded-2xl border bg-gradient-to-r from-primary/5 via-card to-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <span>Automated Core Pipeline Integration</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Every shipment booked via Dhruto API or Web Portal automatically undergoes address normalization and RTO risk evaluation. High-risk shipments trigger verification flags before line-haul dispatch.
          </p>
        </div>

        <Link href="/developer/webhooks">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <span>Explore Developer API</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
