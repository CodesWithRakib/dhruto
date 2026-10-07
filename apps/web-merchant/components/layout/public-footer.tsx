"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher, Logo } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
export function PublicFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const locale = useLocale();

  return (
    <footer className="mt-auto border-t border-border bg-[hsl(var(--hero-dark-base))] text-muted-foreground">
      <div className="dhruto-container py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand block */}
          <div className="space-y-4">
            <Logo inverted />
            <p className="text-body text-muted-foreground font-medium">
              Next-Gen Logistics & Courier OS
            </p>
            <div className="pt-2">
              <LanguageSwitcher currentLocale={locale} label={tn("language")} />
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="text-body font-semibold text-white mb-4">{t("quickLinks")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {tn("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {tn("services")}
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {tn("tracking")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {t("career")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h2 className="text-body font-semibold text-white mb-4">{t("support")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/faq"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {t("returnPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-body text-muted-foreground hover:text-white transition-colors"
                >
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Socials & Connect */}
          <div>
            <h2 className="text-body font-semibold text-white mb-4">{t("connect")}</h2>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary hover:bg-primary hover:text-white transition-colors"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary hover:bg-primary hover:text-white transition-colors"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary hover:bg-primary hover:text-white transition-colors"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary hover:bg-primary hover:text-white transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-border pt-6 text-center text-body-sm text-muted-foreground">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
