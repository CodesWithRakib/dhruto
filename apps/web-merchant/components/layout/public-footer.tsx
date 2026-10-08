"use client";

import * as React from "react";
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
  Send,
  Code2,
} from "lucide-react";

export function PublicFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const [subscribed, setSubscribed] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="relative mt-auto border-t border-border bg-surface text-muted-foreground overflow-hidden">
      {/* Top accent radiant gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* 1. Enterprise Trust & Service Guarantee Strip */}
      <div className="border-b border-border bg-surface-muted/50 py-6">
        <div className="dhruto-container">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Rapid Pickup</p>
                <p className="text-[11px] text-muted-foreground">Within 60 mins in Metro</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success-soft text-success-soft-foreground">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Next-Day Payout</p>
                <p className="text-[11px] text-muted-foreground">Automated Bank & Wallet</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/25 bg-warning-soft text-warning-soft-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Transit Insurance</p>
                <p className="text-[11px] text-muted-foreground">100% Escrow Protection</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-info/25 bg-info-soft text-info-soft-foreground">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">64 Districts Reach</p>
                <p className="text-[11px] text-muted-foreground">495 Thanas with GPS Line-haul</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Body */}
      <div className="dhruto-container relative z-10 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission column (2 cols on desktop) */}
          <div className="space-y-4 lg:col-span-2">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <Logo inverted />
            </Link>
            <p className="text-body text-muted-foreground font-medium max-w-sm leading-relaxed">
              Dhruto is the next-generation courier & logistics operating system for Bangladesh.
              Engineered for high-volume e-commerce merchants, retail distribution networks, and smart fulfillment.
            </p>

            {/* Live operational beacon badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span>99.98% Service Uptime • Live Line-Haul Radar</span>
            </div>

            {/* Dispatch advisory newsletter mini-form */}
            <div className="pt-2 max-w-sm">
              <p className="text-xs font-semibold text-foreground mb-1.5">
                Logistics Advisory & Fuel Surcharge Alerts:
              </p>
              {subscribed ? (
                <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-2.5 text-xs font-medium text-success-soft-foreground">
                  ✓ Subscribed to merchant route updates.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <label htmlFor="footer-newsletter-email" className="sr-only">
                    Merchant email
                  </label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter merchant email"
                    required
                    className="flex-1 rounded-xl border border-border/60 bg-surface/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 shadow-sm"
                  >
                    <span>Join</span>
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="text-body font-semibold text-foreground mb-4 tracking-wide">{t("quickLinks")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {tn("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {tn("services")}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {tn("calculator")}
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {tn("tracking")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {t("career")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer & Tools */}
          <div>
            <h2 className="text-body font-semibold text-foreground mb-4 tracking-wide">Developer & Hubs</h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/merchant/developer/api-keys"
                  className="inline-flex items-center gap-1.5 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  REST API Docs
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/developer/webhooks"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  Webhook Simulator
                </Link>
              </li>
              <li>
                <a
                  href="#coverage"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  Sorting Hub Directory
                </a>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-body text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise Support & Hub Locations */}
          <div className="space-y-4">
            <h2 className="text-body font-semibold text-foreground mb-4 tracking-wide">{t("connect")}</h2>

            <div className="rounded-2xl border border-border bg-surface-muted/50 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <PhoneCall className="h-4 w-4 text-primary" />
                <span>24/7 Operations Hotline</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Live dispatch controller & emergency cargo assistance
              </p>
              <a
                href="tel:+8809612345678"
                className="inline-flex items-center gap-1 text-sm font-mono font-bold text-primary hover:underline"
              >
                +880 9612-DHRUTO
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <div className="pt-1 text-[11px] text-muted-foreground/80 border-t border-border/30">
                HQ: Banani 11, Dhaka • Tejgaon Sort Hub
              </div>
            </div>

            {/* Social pills */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* 3. Bottom Legal & Certifications Bar */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 pt-6 text-center sm:text-left text-body-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dhruto Technologies Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms & SLA
            </Link>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-primary font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Digital Commerce Act 2026 Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
