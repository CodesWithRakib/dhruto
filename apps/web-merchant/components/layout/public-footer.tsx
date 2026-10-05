"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher, Logo } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { MERCHANT_ROUTES } from "@/config/routes";

interface FooterLink {
  href: string;
  labelKey: string;
}

const FOOTER_SECTIONS: { labelKey: string; links: FooterLink[] }[] = [
  {
    labelKey: "company",
    links: [
      { href: "/about", labelKey: "about" },
      { href: "/contact", labelKey: "contact" },
      { href: "/pricing", labelKey: "pricing" },
    ],
  },
  {
    labelKey: "services",
    links: [
      { href: "/services", labelKey: "services" },
      { href: "/track", labelKey: "tracking" },
      { href: "/pricing", labelKey: "serviceRates" },
    ],
  },
  {
    labelKey: "support",
    links: [
      { href: "/faq", labelKey: "faq" },
      { href: "/contact", labelKey: "contactSupport" },
    ],
  },
  {
    labelKey: "legal",
    links: [
      { href: "/privacy", labelKey: "privacy" },
      { href: "/terms", labelKey: "terms" },
    ],
  },
  {
    labelKey: "merchant",
    links: [
      { href: "/login", labelKey: "signIn" },
      { href: "/register", labelKey: "register" },
      { href: MERCHANT_ROUTES.dashboard, labelKey: "dashboard" },
    ],
  },
];

export function PublicFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const locale = useLocale();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="dhruto-container py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-body text-muted-foreground text-pretty">
              {t("tagline")}
            </p>
            <LanguageSwitcher currentLocale={locale} label={tn("language")} />
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.labelKey} aria-label={t(section.labelKey)}>
              <h2 className="text-caption font-semibold uppercase tracking-wider text-foreground">
                {t(section.labelKey)}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={`${section.labelKey}-${link.href}-${link.labelKey}`}>
                    <Link
                      href={link.href}
                      className="text-body text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-caption text-muted-foreground">{t("operatedIn")}</p>
        </div>
      </div>
    </footer>
  );
}
