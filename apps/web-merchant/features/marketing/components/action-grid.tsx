"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Search, ShieldCheck, CheckCircle2, Zap } from "lucide-react";
import { Button, Input } from "@dhruto/ui";

const SAMPLE_TRACKING_CODES = ["DHR-89214", "DHR-45091", "DHR-10928"];

export function ActionGrid() {
  const t = useTranslations("Home");
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingCode.trim();
    if (clean) {
      router.push(`/track/${encodeURIComponent(clean)}`);
    }
  };

  const handleChipClick = (code: string) => {
    setTrackingCode(code);
  };

  return (
    <section className="relative py-12 sm:py-20">
      <div className="dhruto-container relative z-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left Card: Merchant Partnership Promo with Warehouse Background */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-9 flex flex-col justify-between shadow-xl">
            {/* Background image & gradient overlay */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/merchant-hub.jpg"
                alt="Automated Fulfillment Ecosystem"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-10 transition-all duration-700 group-hover:scale-105 group-hover:opacity-15"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/95 to-surface/80" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                  Merchant Partnership • 0% Setup Fee
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {t("merchantBanner.title")}
              </h3>
              <p className="text-body text-muted-foreground text-pretty max-w-lg leading-relaxed">
                {t("merchantBanner.description")}
              </p>

              {/* Bullet perks */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-foreground/90">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Next-Day COD Settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Smart Address Geocoding</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Free Shopify & WooCommerce API</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Dedicated Relationship Manager</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-2">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all inline-flex items-center gap-2">
                  {t("merchantBanner.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Card: Public Parcel Tracking Quick Search Terminal */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-surface p-6 shadow-soft sm:p-9">
            {/* Top ambient glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                  <Search className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-success/30 bg-success-soft px-3.5 py-1 text-xs font-semibold text-success-soft-foreground">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
                  Live GPS Radar
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {t("trackingBanner.title")}
              </h3>
              <p className="text-body text-muted-foreground text-pretty leading-relaxed">
                {t("hero.trackSubtitle")}
              </p>

              {/* Sample tracking quick chips */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Test Sample IDs:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TRACKING_CODES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleChipClick(code)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface px-2.5 py-1 text-xs font-mono font-semibold text-foreground/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Zap className="h-3 w-3 text-primary" />
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleTrackSubmit} className="mt-8 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={trackingCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingCode(e.target.value)}
                  placeholder={t("trackingBanner.placeholder")}
                  className="pl-12 h-14 rounded-xl text-base font-mono tracking-wider border-border/60 bg-surface/80 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all">
                {t("trackingBanner.cta")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
