"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@dhruto/ui";
import {
  ArrowRight,
  BarChart3,
  Bike,
  BrainCircuit,
  Package,
  Radio,
  Search,
  ShieldCheck,
  Wallet,
  Warehouse,
  Workflow,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { ADMIN_ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/page-header";
import { AdminIllustrationBg } from "@/components/visual/illustration-backgrounds";
import { AdminNetworkStatus } from "./admin-network-status";

/**
 * Admin operations supervision command center.
 *
 * Provides real-time oversight of shipments, hubs, riders, finance,
 * AI fraud intelligence, and webhook infrastructure.
 */
export function AdminConsole() {
  const t = useTranslations("Admin");

  const primaryDomains = [
    {
      href: ADMIN_ROUTES.parcels,
      labelKey: "parcels",
      icon: Package,
      tone: "bg-info/10 text-info-soft-foreground",
      cta: t("ctas.openParcels"),
      badge: t("badges.realtimeTracking"),
    },
    {
      href: ADMIN_ROUTES.hub,
      labelKey: "hub",
      icon: Warehouse,
      tone: "bg-warning/10 text-warning-soft-foreground",
      cta: t("ctas.superviseHubs"),
      badge: t("badges.activeHubs"),
    },
    {
      href: ADMIN_ROUTES.rider,
      labelKey: "rider",
      icon: Bike,
      tone: "bg-success/10 text-success-soft-foreground",
      cta: t("ctas.manageFleet"),
      badge: t("badges.lastMileRunsheets"),
    },
    {
      href: ADMIN_ROUTES.finance,
      labelKey: "finance",
      icon: Wallet,
      tone: "bg-primary/10 text-primary-soft-foreground",
      cta: t("ctas.openFinance"),
      badge: t("badges.payoutApprovalQueue"),
    },
  ];

  const intelligenceCards = [
    {
      href: ADMIN_ROUTES.analytics,
      title: t("intelligence.analyticsTitle"),
      description: t("intelligence.analyticsDescription"),
      icon: BarChart3,
      badge: t("badges.executiveKpis"),
    },
    {
      href: ADMIN_ROUTES.intelligence,
      title: t("intelligence.intelligenceTitle"),
      description: t("intelligence.intelligenceDescription"),
      icon: BrainCircuit,
      badge: t("badges.mlProtection"),
    },
    {
      href: ADMIN_ROUTES.integrations,
      title: t("intelligence.integrationsTitle"),
      description: t("intelligence.integrationsDescription"),
      icon: Radio,
      badge: t("badges.apiInfrastructure"),
    },
  ];

  return (
    <div className="relative w-full space-y-6 pb-6">
      <AdminIllustrationBg opacity={0.35} />
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/workflow">
              <Button
                variant="outline"
                className="gap-1.5"
              >
                <Workflow className="h-4 w-4" />
                <span>{t("systemGuide")}</span>
              </Button>
            </Link>
            <Link href={ADMIN_ROUTES.tracking}>
              <Button
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
                <span>{t("globalLookup")}</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Live network status (system health + operations analytics) */}
      <AdminNetworkStatus />

      {/* Primary Operational Command Pillars (4 Columns) */}
      <section aria-label="Operational Domains">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("commandDomains")}
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium">{t("directAccess")}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {primaryDomains.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.href}
                className="group flex flex-col justify-between rounded-2xl bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${section.tone}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {section.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                    {t(`${section.labelKey}.title`)}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {t(`${section.labelKey}.description`)}
                  </p>
                </div>

                <div className="mt-4 pt-4">
                  <Link href={section.href} className="block">
                    <Button variant="outline" size="sm" className="h-9 w-full text-xs font-bold justify-between px-3 rounded-xl group-hover:text-primary">
                      <span>{section.cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Intelligence & Infrastructure Grid (3 Columns) */}
      <section aria-label="Intelligence & Infrastructure">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("platformGateways")}
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium">{t("telemetryAutomation")}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {intelligenceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col justify-between rounded-2xl bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span>{t("exploreTelemetry")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Security & Audit Notice */}
      <Card className="rounded-2xl bg-surface-muted/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">{t("supervisoryNotice")}</span>{" "}
            {t("supervisoryNoticeText")}
          </p>
        </div>
      </Card>
    </div>
  );
}
