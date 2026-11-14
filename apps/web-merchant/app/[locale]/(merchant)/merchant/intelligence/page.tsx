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
  ListFilter,
  Sliders,
} from "lucide-react";
import { SmartAddressParser } from "@/features/intelligence/components/smart-address-parser";
import { RtoRiskMeter } from "@/features/intelligence/components/rto-risk-meter";
import { AddressConfirmation } from "@/features/intelligence/components/address-confirmation";
import { IntelligenceReviewQueue } from "@/features/intelligence/components/intelligence-review-queue";
import { useGetIntelligenceHealthQuery } from "@/features/intelligence/api/intelligence.api";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { MERCHANT_ROUTES } from "@/config/routes";

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState<"queue" | "both" | "address" | "risk">("queue");
  // Phase 3 (T-LIT-01): KPI strip reads live health instead of statics.
  const { data: health, isLoading: healthLoading } = useGetIntelligenceHealthQuery();
  const h = health?.data;

  return (
    <div className="w-full space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-soft text-warning-soft-foreground text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Dhruto Cognitive Intelligence Engine v2.0
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Logistics AI & RTO Prediction Suite
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Pre-dispatch customer risk assessment, bilingual natural language address parsing,
            and phonetic typo correction for Bangladesh e-commerce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button className="flex items-center gap-2 rounded-xl font-bold">
              <Zap className="h-4 w-4" />
              Book With AI Auto-Fill
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl bg-surface-elevated space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>District Coverage</span>
            <MapPin className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {healthLoading ? "—" : `${h?.districts ?? 0} districts`}
          </div>
          <p className="text-xs text-muted-foreground">All Bangladesh divisions & hubs</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-elevated space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Upazila Lexicon</span>
            <Cpu className="h-4 w-4 text-info" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {healthLoading ? "—" : `${h?.thanas ?? 0} thanas`}
          </div>
          <p className="text-xs text-muted-foreground">With postal code matching</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-elevated space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Scoring Model</span>
            <TrendingDown className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {healthLoading ? "—" : (h?.models?.[0]?.version ?? h?.datasetVersion ?? "—")}
          </div>
          <p className="text-xs text-muted-foreground">Explainable rule baseline, ML-ready</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-elevated space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Geo Dataset</span>
            <CheckCircle2 className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {healthLoading ? "—" : (h?.datasetVersion ?? "—")}
          </div>
          <p className="text-xs text-muted-foreground">{h?.datasetSource ?? "Bangladesh geo index"}</p>
        </div>
      </div>

      {/* Main Suite Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-elevated p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span>Pre-Dispatch Risk Radar & Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "address"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Address NLP Parser</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("risk")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "risk"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>RTO Risk Radar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("both")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "both"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>All Workbench Tools</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <IntelligenceReviewQueue />
        </div>
      )}

      {activeTab === "address" && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <h2 className="text-base font-bold text-foreground">NLP Address Parsing Engine</h2>
          </div>
          <SmartAddressParser />
          <AddressConfirmation />
        </div>
      )}

      {activeTab === "risk" && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            <h2 className="text-base font-bold text-foreground">Recipient Risk & RTO Radar</h2>
          </div>
          <RtoRiskMeter />
        </div>
      )}

      {activeTab === "both" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <h2 className="text-base font-bold text-foreground">NLP Address Parsing Engine</h2>
            </div>
            <SmartAddressParser />
            <AddressConfirmation />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-danger" />
              <h2 className="text-base font-bold text-foreground">Recipient Risk & RTO Radar</h2>
            </div>
            <RtoRiskMeter />
          </div>
        </div>
      )}

      {/* Banner / Developer Docs Note */}
      <div className="p-6 rounded-xl border bg-surface-muted flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <span>Automated Core Pipeline Integration</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Every shipment booked via Dhruto API or Web Portal automatically undergoes address
            normalization and RTO risk evaluation. High-risk shipments trigger verification flags
            before line-haul dispatch.
          </p>
        </div>

        <Link href={MERCHANT_ROUTES.webhooks}>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs whitespace-nowrap"
          >
            <span>Explore Developer API</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
