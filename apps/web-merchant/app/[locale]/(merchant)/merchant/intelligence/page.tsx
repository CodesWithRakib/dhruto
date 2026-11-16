"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  MapPin,
  Cpu,
  Zap,
  CheckCircle2,
  TrendingDown,
  ListFilter,
  Sliders,
} from "lucide-react";
import { SmartAddressParser } from "@/features/intelligence/components/smart-address-parser";
import { RtoRiskMeter } from "@/features/intelligence/components/rto-risk-meter";
import { AddressConfirmation } from "@/features/intelligence/components/address-confirmation";
import { IntelligenceReviewQueue } from "@/features/intelligence/components/intelligence-review-queue";
import { useGetIntelligenceHealthQuery } from "@/features/intelligence/api/intelligence.api";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { MERCHANT_ROUTES } from "@/config/routes";

export default function IntelligencePage() {
  const t = useTranslations("Intelligence");
  const [activeTab, setActiveTab] = useState<"queue" | "both" | "address" | "risk">("queue");
  const { data: health, isLoading: healthLoading } = useGetIntelligenceHealthQuery();
  const h = health?.data;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-8 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Hero Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-caption font-semibold mb-2.5 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className="text-display-xs sm:text-display-sm font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-body-sm mt-1 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={MERCHANT_ROUTES.createBooking}>
            <Button className="flex items-center gap-2 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
              <Zap className="h-4 w-4" />
              <span>{t("bookWithAi")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Highlight Strip with Top Specular Lines */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md space-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          <div className="flex items-center justify-between text-caption text-muted-foreground font-bold uppercase tracking-wider">
            <span>{t("districtCoverage")}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">
            {healthLoading ? "—" : t("districtsCount", { count: h?.districts ?? 64 })}
          </div>
          <p className="text-caption text-muted-foreground">{t("districtCoverageDesc")}</p>
        </div>

        <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md space-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="flex items-center justify-between text-caption text-muted-foreground font-bold uppercase tracking-wider">
            <span>{t("upazilaLexicon")}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">
            {healthLoading ? "—" : t("thanasCount", { count: h?.thanas ?? 590 })}
          </div>
          <p className="text-caption text-muted-foreground">{t("upazilaLexiconDesc")}</p>
        </div>

        <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md space-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex items-center justify-between text-caption text-muted-foreground font-bold uppercase tracking-wider">
            <span>{t("scoringModel")}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">
            {healthLoading ? "—" : (h?.models?.[0]?.version ?? h?.datasetVersion ?? "v2.4-neural")}
          </div>
          <p className="text-caption text-muted-foreground">{t("scoringModelDesc")}</p>
        </div>

        <div className="relative overflow-hidden p-5 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md space-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <div className="flex items-center justify-between text-caption text-muted-foreground font-bold uppercase tracking-wider">
            <span>{t("geoDataset")}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">
            {healthLoading ? "—" : (h?.datasetVersion ?? "BBS-2026-v2")}
          </div>
          <p className="text-caption text-muted-foreground">{h?.datasetSource ?? "Bangladesh geo index"}</p>
        </div>
      </div>

      {/* Main Suite Navigation Tabs */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-surface-elevated/90 p-1.5 w-fit shadow-xs backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span>{t("tabQueue")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "address"
              ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{t("tabAddress")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("risk")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "risk"
              ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>{t("tabRisk")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("both")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "both"
              ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
              : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{t("tabBoth")}</span>
        </button>
      </div>

      {/* Main Suite Workspace */}
      <div className="relative z-10">
        {activeTab === "queue" && (
          <div className="space-y-4">
            <IntelligenceReviewQueue />
          </div>
        )}

        {activeTab === "address" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <SmartAddressParser showApplyButton={false} />
            </div>
            <div className="lg:col-span-4">
              <AddressConfirmation />
            </div>
          </div>
        )}

        {activeTab === "risk" && (
          <div className="max-w-2xl mx-auto">
            <RtoRiskMeter />
          </div>
        )}

        {activeTab === "both" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <SmartAddressParser showApplyButton={false} />
              <RtoRiskMeter />
            </div>
            <div className="max-w-2xl mx-auto">
              <AddressConfirmation />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
