"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Layers,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

interface ServicesHeroProps {
  badge?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  stats?: {
    coverage: string;
    coverageLabel: string;
    thanas: string;
    thanasLabel: string;
    daily: string;
    dailyLabel: string;
    sla: string;
    slaLabel: string;
  };
}

export function ServicesHero({
  badge = "Nationwide Network • 64 Districts",
  title = "Logistics Services Engineered for Unbroken Scale",
  description = "From high-velocity same-day intra-city drops to nationwide 64-district line-haul and next-morning COD payouts — all powered by an auditable digital twin for every shipment.",
  stats,
}: ServicesHeroProps) {
  const [activeFilter, setActiveFilter] = React.useState<string>("all");

  const categories = [
    { id: "all", label: "All Capabilities", icon: Layers, target: "#services-grid" },
    { id: "intra-city", label: "Intra-City Same Day", icon: Zap, target: "#services-grid" },
    { id: "nationwide", label: "64 Districts Line-Haul", icon: Truck, target: "#route-matrix" },
    { id: "cod", label: "COD & Escrow", icon: ShieldCheck, target: "#services-grid" },
    { id: "api", label: "Developer & API", icon: Sparkles, target: "#tech-showcase" },
  ];

  const handleCategoryClick = (target: string, id: string) => {
    setActiveFilter(id);
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-inverse pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Starry Grid & Ambient Glow Orbs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-35 blur-[120px]"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.45), hsl(var(--info) / 0.15), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-10%] top-[30%] h-[420px] w-[420px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: "radial-gradient(circle, hsl(var(--success) / 0.4), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Floating Live Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md transition-all">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>{badge}</span>
          </div>
        </div>

        {/* Hero Title & Editorial Narrative */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {title ? (
              <>
                {title}{" "}
                <span className="srv-serif text-primary block sm:inline">for Unbroken Scale</span>
              </>
            ) : (
              <>
                Logistics Services Engineered for{" "}
                <span className="srv-serif text-primary">Unbroken Scale</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-inverse-muted sm:text-lg">
            {description}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98]"
            >
              <span>Create Merchant Account</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => handleCategoryClick("#route-matrix", "nationwide")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10"
            >
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Explore SLA & Delivery Routes</span>
            </button>
          </div>
        </div>

        {/* Category Quick Filter Pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.target, cat.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-250 ${
                  isActive
                    ? "bg-primary/20 text-white"
                    : "bg-white/5 text-inverse-muted hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Operational Metrics Telemetry Strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="srv-stat-pill">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-success/10 text-success">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                {stats?.coverage ?? "64"}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {stats?.coverageLabel ?? "Districts Covered"}
              </div>
            </div>
          </div>

          <div className="srv-stat-pill">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-info/10 text-info">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                {stats?.thanas ?? "495+"}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {stats?.thanasLabel ?? "Thanas Served"}
              </div>
            </div>
          </div>

          <div className="srv-stat-pill">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                {stats?.daily ?? "10K+"}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {stats?.dailyLabel ?? "Daily Parcels Moved"}
              </div>
            </div>
          </div>

          <div className="srv-stat-pill">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-warning/10 text-warning">
              <PackageCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                {stats?.sla ?? "99.5%"}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {stats?.slaLabel ?? "On-Time Delivery SLA"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
