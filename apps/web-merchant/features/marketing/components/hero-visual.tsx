import React from "react";
import Image from "next/image";
import { Navigation, ShieldCheck, Zap } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-lg lg:max-w-none items-center justify-center p-2 sm:p-4">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-3xl opacity-75"
        aria-hidden="true"
      />

      {/* Main Showcase Container */}
      <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-border bg-surface/80 p-2 sm:p-3 shadow-2xl backdrop-blur-xl">
        {/* Visual Frame */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-muted/30">
          <Image
            src="/images/hero-logistics.jpg"
            alt="Dhruto Intelligent Logistics Operating System"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover transition-transform duration-700 hover:scale-105"
          />

          {/* High-tech subtle bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* 1. Floating Badge — Top Right: Express 45-Min */}
        <div className="absolute -top-2 right-4 sm:-right-2 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground border border-primary/20">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-foreground leading-tight">Express 45-Min</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Dhaka Metro Active</p>
          </div>
        </div>

        {/* 2. Floating Card — Center Right: COD Settlement */}
        <div className="absolute top-1/2 -right-2 sm:-right-5 -translate-y-1/2 hidden sm:flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning-soft-foreground border border-warning/30">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-xs font-bold text-foreground leading-tight">৳24,500 Collected</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Instant Wallet Settlement</p>
          </div>
        </div>

        {/* 3. Floating Telemetry Card — Bottom Left: Real-time Live Tracking */}
        <div className="absolute -bottom-3 left-4 sm:-left-3 rounded-2xl border border-border bg-surface/95 p-3.5 shadow-2xl backdrop-blur-xl min-w-[220px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Navigation className="h-3.5 w-3.5 text-primary rotate-45" />
              <span>TRK-89214-BD</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success-soft-foreground border border-success/30">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" aria-hidden="true" />
              In Transit
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>Gulshan ➔ Dhanmondi</span>
              <span className="text-foreground font-semibold">ETA 18m</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-primary to-success" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
