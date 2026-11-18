"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export function StatsStrip() {
  return (
    <section className="py-12 sm:py-16 bg-[var(--soft-bg)]">
      <div className="dhruto-container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-12 pb-6">
          {/* Left statement with round icon */}
          <div className="flex items-center gap-5 max-w-md">
            <span className="flex-none w-14 h-14 rounded-full bg-[var(--tint)] flex items-center justify-center text-[var(--dk)]">
              <ShieldCheck className="h-6 w-6 text-[var(--acc2)]" />
            </span>
            <p className="text-lg sm:text-xl font-medium tracking-tight text-[var(--text)] leading-snug">
              Trusted &amp; relied on by 12,000+ high-volume merchants across Bangladesh
            </p>
          </div>

          {/* Right numbers row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
            <div>
              <b className="block text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] tabular-nums">
                64<sup className="text-[var(--acc2)] font-bold text-sm ml-0.5">Districts</sup>
              </b>
              <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Nationwide Line-Haul</span>
            </div>

            <div>
              <b className="block text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] tabular-nums">
                495<sup className="text-[var(--acc2)] font-bold text-sm ml-0.5">Thanas</sup>
              </b>
              <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Doorstep Reach</span>
            </div>

            <div>
              <b className="block text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] tabular-nums">
                99.4<sup className="text-[var(--acc2)] font-bold text-sm ml-0.5">%</sup>
              </b>
              <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">On-Time SLA</span>
            </div>

            <div>
              <b className="block text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] tabular-nums">
                24<sup className="text-[var(--acc2)] font-bold text-sm ml-0.5">/7</sup>
              </b>
              <span className="text-xs sm:text-sm text-[var(--muted-text)] mt-1 block">Radar Dispatch</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
