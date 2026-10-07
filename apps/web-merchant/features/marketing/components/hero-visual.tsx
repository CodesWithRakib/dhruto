import React from "react";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-lg items-center justify-center p-4 lg:max-w-none">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-100/60 via-teal-50/40 to-transparent blur-2xl"
        aria-hidden="true"
      />

      {/* Main Illustration container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-100/80 bg-gradient-to-b from-white/90 to-slate-50/60 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur-sm sm:p-8">
        {/* City silhouette & road backdrop */}
        <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-emerald-50/50 to-emerald-100/30 py-8">
          {/* Stylized Scooter Rider Vector Illustration */}
          <svg
            viewBox="0 0 360 260"
            className="h-auto w-full max-w-[320px] drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft ground shadow */}
            <ellipse cx="180" cy="235" rx="140" ry="12" fill="#0F172A" fillOpacity="0.08" />

            {/* Scooter Rear Wheel */}
            <circle cx="85" cy="195" r="32" fill="#1E293B" stroke="#0F5132" strokeWidth="4" />
            <circle cx="85" cy="195" r="18" fill="#F8FAFC" />
            <circle cx="85" cy="195" r="7" fill="#0F5132" />

            {/* Scooter Front Wheel */}
            <circle cx="270" cy="195" r="32" fill="#1E293B" stroke="#0F5132" strokeWidth="4" />
            <circle cx="270" cy="195" r="18" fill="#F8FAFC" />
            <circle cx="270" cy="195" r="7" fill="#0F5132" />

            {/* Scooter Body / Chassis */}
            <path
              d="M85 195 L140 195 L170 170 L230 170 L255 130 L270 195"
              stroke="#0F5132"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Green Body Panels */}
            <path d="M100 175 C100 150 120 145 155 145 L190 170 L140 185 Z" fill="#0F5132" />
            <path d="M210 165 L245 110 L260 110 L250 175 Z" fill="#10A34A" />

            {/* Scooter Seat */}
            <path d="M110 142 C125 142 165 145 175 150 L120 152 Z" fill="#0F172A" />

            {/* Handlebar */}
            <path
              d="M245 110 L240 85 L255 83"
              stroke="#334155"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Headlight beam */}
            <polygon points="265,120 340,100 340,160 265,135" fill="#FEF08A" fillOpacity="0.25" />

            {/* Delivery Box (Branded Dhruto) */}
            <rect x="50" y="105" width="55" height="55" rx="6" fill="#0F5132" />
            <rect x="53" y="108" width="49" height="49" rx="4" fill="#14532D" />
            {/* White / Green Dhruto courier logo on box */}
            <path
              d="M68 132 H84 M79 126 L85 132 L79 138"
              stroke="#DCFCE7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="87" cy="132" r="1.5" fill="#4ADE80" />

            {/* Rider Legs & Torso */}
            <path
              d="M145 145 L165 175 L195 175"
              stroke="#1E293B"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Rider Torso in Green Dhruto uniform */}
            <path d="M160 145 L180 95 L210 98 L200 150 Z" fill="#15803D" />
            {/* Rider Arm to handlebars */}
            <path
              d="M185 105 L215 115 L240 88"
              stroke="#15803D"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Rider Hand */}
            <circle cx="240" cy="88" r="4.5" fill="#FBBF24" />

            {/* Rider Head with Helmet */}
            <circle cx="195" cy="65" r="17" fill="#0F5132" />
            <path d="M192 60 C202 60 213 65 210 74 L190 74 Z" fill="#0F172A" />
            {/* Helmet Visor shine */}
            <path
              d="M196 62 Q206 63 207 70"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Motion Lines */}
            <line
              x1="20"
              y1="180"
              x2="45"
              y2="180"
              stroke="#10A34A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="6 4"
              opacity="0.6"
            />
            <line
              x1="15"
              y1="195"
              x2="40"
              y2="195"
              stroke="#10A34A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="5 3"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* 1. Floating Badge — Top Right: Five Delivery Across Bangladesh */}
        <div className="absolute -top-3 -right-3 sm:-right-5 flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-lg shadow-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-foreground leading-tight">Fast Delivery</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Across Bangladesh</p>
          </div>
        </div>

        {/* 2. Floating Badge — Center Right: Live Tracking Card */}
        <div className="absolute top-1/2 -right-2 sm:-right-8 -translate-y-1/2 rounded-xl border border-border bg-white p-3.5 shadow-xl shadow-slate-900/10 min-w-[190px]">
          <div className="flex items-center gap-1.5 text-caption font-semibold text-foreground">
            <Navigation className="h-3.5 w-3.5 text-primary rotate-45" />
            <span>Live Tracking</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-bold text-slate-800 tracking-wide">
            TRK123456789
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-800">Out for Delivery</span>
          </div>
        </div>

        {/* 3. Floating Badge — Bottom Left: Fast Delivery / সকল ডেলিভারি */}
        <div className="absolute -bottom-4 left-4 sm:left-6 flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 shadow-lg shadow-slate-900/5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="text-left">
            <p className="text-[12px] font-bold text-foreground leading-none">Fast Delivery</p>
            <p className="text-[11px] text-muted-foreground leading-none mt-1">
              সকল ডেলিভারি নিশ্চিত
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
