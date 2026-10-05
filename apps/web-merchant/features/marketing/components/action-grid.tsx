"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { Button, Input } from "@dhruto/ui";

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

  return (
    <section className="py-12 sm:py-16">
      <div className="dhruto-container">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left Card: Merchant Registration Promo */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-50/70 via-surface to-surface p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {/* Courier / Merchant illustration avatar */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                  Merchant Partnership
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("merchantBanner.title")}
              </h3>
              <p className="text-body text-muted-foreground text-pretty max-w-md">
                {t("merchantBanner.description")}
              </p>
            </div>

            <div className="mt-6 pt-2">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto inline-flex items-center gap-2">
                  {t("merchantBanner.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Card: Public Parcel Tracking Quick Search */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
            <div className="space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("trackingBanner.title")}
              </h3>
              <p className="text-body text-muted-foreground text-pretty">
                {t("hero.trackSubtitle")}
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="mt-6 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder={t("trackingBanner.placeholder")}
                  className="pl-10 h-12 text-body font-mono"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold">
                {t("trackingBanner.cta")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
