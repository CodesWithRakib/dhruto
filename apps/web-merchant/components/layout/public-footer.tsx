"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import {
  PhoneCall,
  ShieldCheck,
  ArrowUpRight,
  Coins,
  MapPin,
  Clock,
  Mail,
  Code2,
  ArrowUp,
  Sparkles,
} from "lucide-react";

export function PublicFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative mt-auto bg-[var(--dk2)] text-white/70 overflow-hidden">
      {/* Top accent radiant gradient line */}

      {/* 1. Pre-Footer Call-to-Action Bar */}
      <div className="py-10 sm:py-14">
        <div className="dhruto-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="pill mb-3">Enterprise Logistics</span>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white">
              Have high-volume deliveries <em className="text-[var(--acc)] font-normal italic">in mind?</em>
            </h3>
            <p className="text-sm text-white/70 mt-1 max-w-lg">
              Talk to our corporate logistics engineers for custom rates, dedicated line-haul routes, and API onboarding.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="btn-bl h-12 px-6 rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Start Shipping Now
              <ArrowUpRight className="h-4 w-4 ar" />
            </Link>
            <a
              href="mailto:hello@dhruto.com"
              className="btn-bo h-12 px-5 rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              hello@dhruto.com
            </a>
          </div>
        </div>
      </div>

      {/* 2. Enterprise Trust & Service Guarantee Strip */}
      <div className="bg-white/[0.02] py-6">
        <div className="dhruto-container">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[var(--acc)]">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Rapid Pickup</p>
                <p className="text-[11px] text-white/60">Within 60 mins in Metro</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[var(--acc)]">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Next-Day Payout</p>
                <p className="text-[11px] text-white/60">Automated Bank &amp; MFS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[var(--acc)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Transit Protection</p>
                <p className="text-[11px] text-white/60">COD tracked to settlement</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[var(--acc)]">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">64 Districts Reach</p>
                <p className="text-[11px] text-white/60">495 Thanas Line-Haul</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Footer Body */}
      <div className="dhruto-container relative z-10 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission column (2 cols on desktop) */}
          <div className="space-y-4 lg:col-span-2">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <Logo inverted />
            </Link>
            <p className="text-sm text-white/70 font-normal max-w-sm leading-relaxed">
              Dhruto is Bangladesh&apos;s intelligent logistics &amp; parcel courier operating system.
              Engineered for high-volume e-commerce merchants, retail distribution networks, and smart fulfillment.
            </p>

            {/* Live operational beacon badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[var(--acc)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acc)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--acc)]" />
              </span>
              <span>Live system status • Real-time parcel tracking</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-[var(--acc)] transition-colors">
                  {tn("home")}
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-[var(--acc)] transition-colors">
                  {tn("services")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[var(--acc)] transition-colors">
                  {tn("calculator")}
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-[var(--acc)] transition-colors">
                  {tn("tracking")}
                </Link>
              </li>
              <li>
                <Link href="/workflow" className="hover:text-[var(--acc)] transition-colors font-medium text-[var(--acc)]">
                  Operations Guide
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--acc)] transition-colors">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer & Hubs */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Developers &amp; Hubs</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/merchant/developer/api-keys" className="inline-flex items-center gap-1.5 hover:text-[var(--acc)] transition-colors">
                  <Code2 className="h-3.5 w-3.5 text-[var(--acc)]" />
                  REST API Docs
                </Link>
              </li>
              <li>
                <Link href="/merchant/developer/webhooks" className="hover:text-[var(--acc)] transition-colors">
                  Webhook Simulator
                </Link>
              </li>
              <li>
                <a href="#services" className="hover:text-[var(--acc)] transition-colors">
                  Sorting Hub Directory
                </a>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[var(--acc)] transition-colors">
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--acc)] transition-colors">
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise Support & Hotline */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Operations</h4>
            <div className="rounded-2xl bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <PhoneCall className="h-3.5 w-3.5 text-[var(--acc)]" />
                <span>24/7 Operations Hotline</span>
              </div>
              <p className="text-[11px] text-white/60">
                Live dispatch controller &amp; emergency cargo assistance
              </p>
              <a
                href="tel:+8809612345678"
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[var(--acc)] hover:underline"
              >
                +880 9612-DHRUTO
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            <a
              href="mailto:support@dhruto.com"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:text-white transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-[var(--acc)]" />
              support@dhruto.com
            </a>
          </div>
        </div>
      </div>

      {/* 4. Massive Deshbyte-Style Background Watermark */}
      <div className="fword" aria-hidden="true">
        Dhruto
      </div>

      {/* 5. Bottom Copyright & Back-to-Top Bar */}
      <div className="dhruto-container relative z-10 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Dhruto Technologies Ltd. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms &amp; SLA
            </Link>
            <span>•</span>
            <Link href="/status" className="hover:text-white transition-colors">
              System Status
            </Link>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-[var(--acc)] font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Digital Commerce Act 2026
            </span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 text-white font-medium hover:text-[var(--acc)] transition-colors"
          >
            <span>Back to top</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--acc)] hover:text-[var(--dk)] transition-all">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
