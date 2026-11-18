"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Search, ArrowRight, Zap } from "lucide-react";
import { Button, Input } from "@dhruto/ui";

export const REAL_SAMPLE_CODES = [
  { code: "DHR-2610-00101", status: "Delivered", district: "Dhanmondi, Dhaka" },
  { code: "DHR-2610-00107", status: "Out for Delivery", district: "Gulshan, Dhaka" },
  { code: "DHR-2610-00113", status: "In Transit", district: "Panchlaish, Chittagong" },
];

export function TrackSearchCard() {
  const t = useTranslations("Tracking");
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) {
      router.push(`/track/${encodeURIComponent(clean)}`);
    }
  };

  const handleQuickCode = (sample: string) => {
    setCode(sample);
    router.push(`/track/${encodeURIComponent(sample)}`);
  };

  return (
    <div className="track-cockpit-card mt-10 p-4 sm:p-7 max-w-3xl mx-auto text-left">
      <form onSubmit={handleSearch} role="search" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <Input
            type="text"
            name="trackingCode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("inputPlaceholder")}
            aria-label={t("searchTitle")}
            autoComplete="off"
            className="h-14 pl-12 pr-4 rounded-xl font-mono text-base tracking-wider bg-white/5 text-white placeholder:text-white/35 focus:ring-2 focus:ring-[var(--acc)]/30 transition-all uppercase"
            required
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="btn-bl h-14 px-8 rounded-xl text-base font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {t("trackBtn")}
          <ArrowRight className="h-4 w-4 ar" aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-4 pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[var(--acc)]" />
          <span className="text-xs text-white/60 font-medium">Click real sample codes to track:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REAL_SAMPLE_CODES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleQuickCode(item.code)}
              className="track-sample-chip"
              title={`Track ${item.status} (${item.district})`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)] animate-pulse" />
              <span>{item.code}</span>
              <span className="text-[10px] text-white/50 font-sans hidden sm:inline">
                • {item.status}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
