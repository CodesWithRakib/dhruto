"use client";

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
} from "lucide-react";

export function PublicFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");

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

            <div className="pt-2 max-w-sm space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Questions about shipping with Dhruto?
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface/80 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                Talk to our team
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
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
                  {t("about")}
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

            <a
              href="mailto:support@dhruto.com"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              support@dhruto.com
            </a>
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
