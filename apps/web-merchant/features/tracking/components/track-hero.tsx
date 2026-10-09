"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import {
  Search,
  ArrowRight,
  Radio,
  Truck,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Zap,
  Play,
  Pause,
  Navigation,
  Activity,
} from "lucide-react";
import { Button, Input } from "@dhruto/ui";

const REAL_SAMPLE_CODES = [
  { code: "DHR-2610-00101", status: "Delivered", district: "Dhanmondi, Dhaka" },
  { code: "DHR-2610-00107", status: "Out for Delivery", district: "Gulshan, Dhaka" },
  { code: "DHR-2610-00113", status: "In Transit", district: "Panchlaish, Chittagong" },
];

interface FlightStage {
  id: number;
  step: string;
  title: string;
  sub: string;
  hub: string;
  coords: string;
  speed: string;
  seal: string;
  eta: string;
  icon: React.ComponentType<{ className?: string }>;
  logs: string[];
}

const FLIGHT_STAGES: FlightStage[] = [
  {
    id: 1,
    step: "01",
    title: "Order Inbound & Cross-Dock",
    sub: "Merchant Tejgaon Warehouse",
    hub: "Tejgaon Inbound Gateway",
    coords: "23.7594° N, 90.3908° E",
    speed: "0 km/h (Docked)",
    seal: "RFID-GEN-9901",
    eta: "Processed in 12m",
    icon: CheckCircle2,
    logs: [
      "[09:12:04] API_TRIGGER: Webhook order booked via merchant API",
      "[09:12:15] INBOUND_CONVEYOR: Dimension 24x18x12cm, 1.4kg verified",
      "[09:12:28] BARCODE_PRINT: Thermal 4x6 label generated with cryptographic hash",
    ],
  },
  {
    id: 2,
    step: "02",
    title: "Central Sorting & Bagging",
    sub: "Dhaka Central Mega-Hub",
    hub: "Dhaka Central Hub, Bay 04",
    coords: "23.8103° N, 90.4125° E",
    speed: "18 km/h (Belt sort)",
    seal: "SEAL-BAG-88402",
    eta: "Cross-docked in 24m",
    icon: Building2,
    logs: [
      "[11:45:10] OPTICAL_SORT: Laser barcode scanner decoded in 140ms",
      "[11:45:22] CHUTE_DISPATCH: Assigned to Chittagong Line-Haul Chute #07",
      "[11:46:01] BAGGED_MANIFEST: Sealed in tamper-evident security bag #BG-4091",
    ],
  },
  {
    id: 3,
    step: "03",
    title: "Inter-District Line-Haul",
    sub: "N1 National Highway Transit",
    hub: "En-Route (Comilla Bypass)",
    coords: "23.4682° N, 91.1788° E",
    speed: "68 km/h (Highway)",
    seal: "GPS-LOCKED-04",
    eta: "02h 45m to CTG Gate",
    icon: Truck,
    logs: [
      "[14:20:18] TOLL_GATEWAY: Meghnabridge RFID automated clearance",
      "[15:10:44] TELEMETRY_PING: GPS Coordinates locked, speed steady at 68 km/h",
      "[15:45:12] SENSOR_CHECK: Cargo compartment temperature 24°C, shocks 0.0g",
    ],
  },
  {
    id: 4,
    step: "04",
    title: "Last-Mile Rider Dispatch",
    sub: "Agrabad Regional Distribution",
    hub: "Agrabad Local Sorting Hub",
    coords: "22.3384° N, 91.8317° E",
    speed: "24 km/h (EV Van)",
    seal: "RIDER-ASSIGN-77",
    eta: "Out for delivery with rider",
    icon: Radio,
    logs: [
      "[08:30:02] DESTINATION_ARRIVAL: Inbound scan at Agrabad Hub Chittagong",
      "[09:15:19] RIDER_HANDOVER: Manifest signed by Rider Tanvir (ID: R-408)",
      "[09:30:45] SMS_DISPATCH: Customer notified of today's delivery window",
    ],
  },
  {
    id: 5,
    step: "05",
    title: "Biometric OTP Handover",
    sub: "Customer Doorstep Delivery",
    hub: "Destination Customer Address",
    coords: "22.3569° N, 91.7832° E",
    speed: "0 km/h (At door)",
    seal: "VERIFIED-DELIVERED",
    eta: "Delivered & COD Settled",
    icon: ShieldCheck,
    logs: [
      "[11:05:12] GEO_PROXIMITY: Rider within 50 meters of delivery location",
      "[11:06:40] OTP_SUBMITTED: 4-digit customer SMS OTP validated successfully",
      "[11:07:05] ESCROW_RELEASE: COD collection recorded in merchant instant ledger",
    ],
  },
];

export function TrackHero() {
  const t = useTranslations("Tracking");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [activeStageId, setActiveStageId] = useState(3);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);

  // Auto-play timer that cycles stages every 5 seconds
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = 50; // update every 50ms for smooth progress bar
    const duration = 5000;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStageId((curr) => (curr >= FLIGHT_STAGES.length ? 1 : curr + 1));
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const activeStage: FlightStage = FLIGHT_STAGES.find((s) => s.id === activeStageId) ?? (FLIGHT_STAGES[2] as FlightStage);

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

  const handleSelectStage = (id: number) => {
    setActiveStageId(id);
    setProgress(0);
    setIsAutoPlay(false); // pause auto-play on manual user interaction
  };

  return (
    <section className="hero dk relative overflow-hidden pt-12 sm:pt-20 pb-16 text-center" id="track-hero">
      {/* Background Star Grid */}
      <div className="hgrid" aria-hidden="true">
        <i style={{ left: "180px", top: "70px" }} />
        <i style={{ left: "340px", top: "180px", animationDelay: "-1.5s" }} />
        <i style={{ left: "820px", top: "120px", animationDelay: "-3s" }} />
        <i style={{ left: "980px", top: "240px", animationDelay: "-4.5s" }} />
        <i style={{ left: "1120px", top: "90px", animationDelay: "-2s" }} />
      </div>

      {/* Ambient Radial Glow Orbs */}
      <div className="glow g1" aria-hidden="true" />
      <div className="glow g2" aria-hidden="true" />

      <div className="dhruto-container relative z-10 max-w-5xl mx-auto px-4">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-[var(--acc)] mb-6 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--acc)] animate-ping" />
          <span>{t("badge")}</span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline font-mono text-[11px] text-white/70">
            RADAR PROTOCOL v4.2
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white max-w-4xl mx-auto leading-[1.08] text-balance">
          Track Every Parcel in{" "}
          <em className="text-[var(--acc)] font-normal italic">Real-Time Telemetry</em>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mt-5 leading-relaxed text-pretty">
          {t("searchSubtitle")}
        </p>

        {/* Central Search Cockpit */}
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
                className="h-14 pl-12 pr-4 rounded-xl font-mono text-base tracking-wider bg-white/5 border-white/15 text-white placeholder:text-white/35 focus:border-[var(--acc)] focus:ring-2 focus:ring-[var(--acc)]/30 transition-all uppercase"
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="btn-bl h-14 px-8 rounded-xl text-base font-semibold whitespace-nowrap shadow-lg shadow-[var(--acc)]/25 hover:shadow-xl hover:shadow-[var(--acc)]/35 inline-flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("trackBtn")}
              <ArrowRight className="h-4 w-4 ar" aria-hidden="true" />
            </Button>
          </form>

          {/* Quick Test Demo Chips (Uses REAL database seed codes) */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
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

        {/* ======================================================================
            NEXT-GEN TELEMETRY FLIGHT DECK (REPLACED CRAMPED ROW WITH FULL COCKPIT)
            ====================================================================== */}
        <div className="mt-14 max-w-4xl mx-auto text-left">
          {/* Header Bar with Telemetry Status & Controls */}
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-ping" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white/90">
                Nationwide Transit Telemetry Simulator
              </span>
              <span className="hidden sm:inline text-xs text-white/40">• GPS Corridor Live</span>
            </div>

            <button
              type="button"
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-mono text-white/80 hover:bg-white/10 transition-colors"
              title={isAutoPlay ? "Pause live telemetry simulation" : "Play live telemetry simulation"}
            >
              {isAutoPlay ? (
                <>
                  <Pause className="h-3 w-3 text-[var(--acc)]" />
                  <span>Auto-cycling</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-success" />
                  <span>Resume cycle</span>
                </>
              )}
            </button>
          </div>

          <div className="track-flight-deck">
            {/* Auto-cycle timer progress bar */}
            {isAutoPlay ? (
              <div
                className="track-flight-timer-bar"
                style={{ width: `${progress}%` }}
              />
            ) : null}

            {/* Stage Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-3 border-b border-white/10 bg-black/20">
              {FLIGHT_STAGES.map((stage) => {
                const Icon = stage.icon;
                const isActive = activeStage.id === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleSelectStage(stage.id)}
                    className={`track-flight-tab ${isActive ? "is-active" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-mono font-bold transition-all ${
                        isActive
                          ? "bg-[var(--acc)] border-[var(--acc)] text-black"
                          : "bg-white/5 border-white/10 text-white/70"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-white/50 uppercase">
                        Stage {stage.step}
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {stage.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Flight HUD Display Screen */}
            <div className="p-4 sm:p-6 bg-gradient-to-b from-black/40 to-black/70 space-y-5">
              <div className="grid gap-4 lg:grid-cols-12 items-center">
                {/* Left Visual: Animated Route Vector Corridor */}
                <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/40 p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mb-2">
                    <span className="flex items-center gap-1.5 text-[var(--acc)] font-bold">
                      <Navigation className="h-3.5 w-3.5" />
                      TRANSIT CORRIDOR
                    </span>
                    <span>ROUTE #N1-EXP</span>
                  </div>

                  {/* Animated SVG Route Path */}
                  <div className="relative h-28 w-full flex items-center justify-center">
                    <svg
                      viewBox="0 0 320 80"
                      className="w-full h-full overflow-visible"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Base Track */}
                      <path
                        d="M 20 40 Q 90 10 160 40 T 300 40"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="3"
                        strokeDasharray="4 4"
                      />
                      {/* Active Flowing Line */}
                      <path
                        d="M 20 40 Q 90 10 160 40 T 300 40"
                        stroke="url(#routeGrad)"
                        strokeWidth="3"
                        strokeDasharray="60"
                        className="animate-[track-route-dash_2.5s_linear_infinite]"
                      />
                      <defs>
                        <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#ff6b00" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                      </defs>

                      {/* Waypoint Nodes */}
                      <circle cx="20" cy="40" r="6" fill="#10b981" />
                      <circle cx="160" cy="40" r="6" fill="#ff6b00" />
                      <circle cx="300" cy="40" r="6" fill="#38bdf8" />
                    </svg>

                    {/* Floating Telemetry Coordinates */}
                    <div className="absolute bottom-1 left-2 font-mono text-[10px] text-white/50">
                      Dhaka Tejgaon
                    </div>
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 font-mono text-[10px] text-[var(--acc)] font-bold">
                      {activeStage.speed}
                    </div>
                    <div className="absolute bottom-1 right-2 font-mono text-[10px] text-white/50">
                      Chittagong Hub
                    </div>
                  </div>
                </div>

                {/* Right Details: Telemetry Sensor HUD Grid */}
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-white/50 uppercase block">Current Location</span>
                    <span className="text-xs font-bold text-white mt-1 block truncate">
                      {activeStage.hub}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-white/50 uppercase block">GPS Coordinates</span>
                    <span className="text-xs font-mono font-bold text-[var(--acc)] mt-1 block truncate">
                      {activeStage.coords}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-white/50 uppercase block">Security Seal</span>
                    <span className="text-xs font-mono font-bold text-white mt-1 block truncate">
                      {activeStage.seal}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-white/50 uppercase block">Status / ETA</span>
                    <span className="text-xs font-bold text-success mt-1 block truncate">
                      {activeStage.eta}
                    </span>
                  </div>
                </div>
              </div>

              {/* Streaming Real-Time Terminal Log Feed */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-1.5 px-1">
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-success animate-pulse" />
                    LIVE SENSOR & OPTICAL SCANNER STREAM
                  </span>
                  <span>LATENCY: 120ms</span>
                </div>
                <div className="track-terminal-box space-y-1">
                  {activeStage.logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-white/40 select-none">&gt;</span>
                      <span className="text-emerald-400">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
