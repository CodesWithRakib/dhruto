"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Navigation, Activity } from "lucide-react";
import { FLIGHT_STAGES, type FlightStage } from "./track-flight-stages";

export function TrackFlightDeck() {
  const [activeStageId, setActiveStageId] = useState(3);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = 50;
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

  const activeStage: FlightStage =
    FLIGHT_STAGES.find((s) => s.id === activeStageId) ?? (FLIGHT_STAGES[2] as FlightStage);

  const handleSelectStage = (id: number) => {
    setActiveStageId(id);
    setProgress(0);
    setIsAutoPlay(false);
  };

  return (
    <div className="mt-14 max-w-4xl mx-auto text-left">
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-mono text-white/80 hover:bg-white/10 transition-colors"
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
        {isAutoPlay ? (
          <div className="track-flight-timer-bar" style={{ width: `${progress}%` }} />
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-3 bg-black/20">
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold transition-all ${
                    isActive
                      ? "bg-[var(--acc)] text-black"
                      : "bg-white/5 text-white/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-white/50 uppercase">
                    Stage {stage.step}
                  </div>
                  <div className="text-xs font-bold text-white truncate">{stage.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 bg-gradient-to-b from-black/40 to-black/70 space-y-5">
          <div className="grid gap-4 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 rounded-2xl bg-black/40 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mb-2">
                <span className="flex items-center gap-1.5 text-[var(--acc)] font-bold">
                  <Navigation className="h-3.5 w-3.5" />
                  TRANSIT CORRIDOR
                </span>
                <span>ROUTE #N1-EXP</span>
              </div>

              <div className="relative h-28 w-full flex items-center justify-center">
                <svg
                  viewBox="0 0 320 80"
                  className="w-full h-full overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 20 40 Q 90 10 160 40 T 300 40"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 20 40 Q 90 10 160 40 T 300 40"
                    stroke="url(#routeGrad)"
                    strokeWidth="3"
                    strokeDasharray="60"
                    className="animate-[track-route-dash_2.5s_linear_infinite]"
                  />
                  <defs>
                    <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" style={{ stopColor: "hsl(var(--success))" }} />
                      <stop offset="50%" style={{ stopColor: "hsl(var(--primary))" }} />
                      <stop offset="100%" style={{ stopColor: "hsl(var(--info))" }} />
                    </linearGradient>
                  </defs>
                  <circle cx="20" cy="40" r="6" className="fill-success" />
                  <circle cx="160" cy="40" r="6" className="fill-primary" />
                  <circle cx="300" cy="40" r="6" className="fill-info" />
                </svg>

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

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl bg-white/5 p-3">
                <span className="text-[10px] font-mono text-white/50 uppercase block">Current Location</span>
                <span className="text-xs font-bold text-white mt-1 block truncate">
                  {activeStage.hub}
                </span>
              </div>

              <div className="rounded-xl bg-white/5 p-3">
                <span className="text-[10px] font-mono text-white/50 uppercase block">GPS Coordinates</span>
                <span className="text-xs font-mono font-bold text-[var(--acc)] mt-1 block truncate">
                  {activeStage.coords}
                </span>
              </div>

              <div className="rounded-xl bg-white/5 p-3">
                <span className="text-[10px] font-mono text-white/50 uppercase block">Security Seal</span>
                <span className="text-xs font-mono font-bold text-white mt-1 block truncate">
                  {activeStage.seal}
                </span>
              </div>

              <div className="rounded-xl bg-white/5 p-3">
                <span className="text-[10px] font-mono text-white/50 uppercase block">Status / ETA</span>
                <span className="text-xs font-bold text-success mt-1 block truncate">
                  {activeStage.eta}
                </span>
              </div>
            </div>
          </div>

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
                  <span className="text-success">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
