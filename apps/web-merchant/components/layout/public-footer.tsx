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
    <footer className="relative mt-auto bg-[var(--dk2)] text-white/80 overflow-hidden">
      {/* 1. Pre-Footer Call-to-Action Bar (Compact & Sleek) */}
      <div className="py-8 sm:py-10 border-b border-white/10">
        <div className="dhruto-container flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--acc)] mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enterprise Logistics Infrastructure</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Have high-volume deliveries <em className="text-[var(--acc)] font-normal italic">in mind?</em>
            </h3>
            <p className="text-xs sm:text-sm text-white/70 max-w-lg">
              Get dedicated line-haul routes, custom API rates, and dedicated key account managers.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              href="/register"
              className="btn-bl h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Start Shipping</span>
              <ArrowUpRight className="h-3.5 w-3.5 ar" />
            </Link>
            <a
              href="mailto:hello@dhruto.com"
              className="btn-bo h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>hello@dhruto.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Enterprise Trust & Service Guarantee Strip (Slim Inline) */}
      <div className="bg-white/[0.02] py-4 border-b border-white/5">
        <div className="dhruto-container">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--acc)]">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Rapid Pickup</p>
                <p className="text-[11px] text-white/60">Within 60m Metro</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--acc)]">
                <Coins className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Next-Day Payout</p>
                <p className="text-[11px] text-white/60">Automated Bank &amp; MFS</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--acc)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Transit Protection</p>
                <p className="text-[11px] text-white/60">Doorstep OTP &amp; Track</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--acc)]">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">64 Districts</p>
                <p className="text-[11px] text-white/60">495 Thanas Line-Haul</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Footer Body (Compact 4-Column Grid) */}
      <div className="dhruto-container relative z-10 py-8 lg:py-10">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission column (2 cols on desktop) */}
          <div className="space-y-3.5 lg:col-span-2">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <Logo inverted />
            </Link>
            <p className="text-xs sm:text-sm text-white/70 font-normal max-w-sm leading-relaxed">
              Bangladesh&apos;s intelligent logistics operating system. Engineered for high-volume e-commerce merchants, retail distribution networks, and modern fulfillment.
            </p>

            {/* Live operational beacon badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-[var(--acc)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acc)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--acc)]" />
              </span>
              <span>All 64 Line-Haul Hubs Operational</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
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
                <Link href="/about" className="hover:text-[var(--acc)] transition-colors">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers & Integration */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Developers</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/merchant/developer/api-keys" className="inline-flex items-center gap-1.5 hover:text-[var(--acc)] transition-colors">
                  <Code2 className="h-3.5 w-3.5 text-[var(--acc)]" />
                  REST API Docs
                </Link>
              </li>
              <li>
                <Link href="/merchant/developer/webhooks" className="hover:text-[var(--acc)] transition-colors">
                  Webhook Engine
                </Link>
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
              <li>
                <Link href="/status" className="hover:text-[var(--acc)] transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Operations & Hotline */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Support</h4>
            <div className="rounded-xl bg-white/5 p-3 space-y-1.5">
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
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-[var(--acc)]" />
              support@dhruto.com
            </a>
          </div>
        </div>
      </div>

      {/* 4. Bottom Copyright & Back-to-Top Bar */}
      <div className="dhruto-container relative z-10 py-4 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Dhruto Technologies Ltd. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms &amp; SLA
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
            className="inline-flex items-center gap-1.5 text-white/80 font-medium hover:text-[var(--acc)] transition-colors text-xs"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
