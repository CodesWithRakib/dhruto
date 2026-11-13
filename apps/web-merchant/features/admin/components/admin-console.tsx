"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card } from "@dhruto/ui";
import {
  ArrowRight,
  BarChart3,
  Bike,
  BrainCircuit,
  CheckCircle2,
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
      tone: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      cta: "Open Parcel Registry",
      badge: "Real-Time Tracking",
    },
    {
      href: ADMIN_ROUTES.hub,
      labelKey: "hub",
      icon: Warehouse,
      tone: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      cta: "Supervise Hubs",
      badge: "14 Active Hubs",
    },
    {
      href: ADMIN_ROUTES.rider,
      labelKey: "rider",
      icon: Bike,
      tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      cta: "Manage Fleet",
      badge: "Last-Mile Runsheets",
    },
    {
      href: ADMIN_ROUTES.finance,
      labelKey: "finance",
      icon: Wallet,
      tone: "border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      cta: "Open Finance Desk",
      badge: "Payout Approval Queue",
    },
  ];

  const intelligenceCards = [
    {
      href: ADMIN_ROUTES.analytics,
      title: "Platform Analytics & Reports",
      description: "Volume trends, delivery success rate, RTO cohort analysis, and customized CSV dataset exports.",
      icon: BarChart3,
      badge: "Executive KPIs",
    },
    {
      href: ADMIN_ROUTES.intelligence,
      title: "AI Risk & Fraud Intelligence",
      description: "Automated high-risk order scoring, return prediction algorithms, and merchant trust verification.",
      icon: BrainCircuit,
      badge: "ML Protection",
    },
    {
      href: ADMIN_ROUTES.integrations,
      title: "Webhooks & Developer Gateways",
      description: "Real-time dispatch event webhooks, partner API keys, and endpoint reliability telemetry.",
      icon: Radio,
      badge: "API Infrastructure",
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
                <span>System Guide</span>
              </Button>
            </Link>
            <Link href={ADMIN_ROUTES.tracking}>
              <Button
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
                <span>Global Lookup</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Network Pulse Status Bar */}
      <Card className="rounded-2xl bg-surface-elevated p-4.5 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-foreground">
                  Nationwide Logistics Network Status
                </h3>
                <Badge variant="primary-soft" className="text-[10px] font-bold">All Systems Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                All 14 hub locations, linehaul transfers, rider dispatch queues, and automated payout engines are operating within SLA.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              SLA: 99.8%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              14 Hubs Online
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Fleet Synchronized
            </span>
          </div>
        </div>
      </Card>

      {/* Primary Operational Command Pillars (4 Columns) */}
      <section aria-label="Operational Domains">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Operational Command Domains
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium">Direct Supervisory Access</span>
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
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-2xs ${section.tone}`}>
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

                <div className="mt-4 pt-4 border-t border-border/60">
                  <Link href={section.href} className="block">
                    <Button variant="outline" size="sm" className="h-9 w-full text-xs font-bold justify-between px-3 rounded-xl group-hover:border-primary/40 group-hover:text-primary">
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
            Platform Intelligence & Gateways
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium">Telemetry & Automation</span>
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
                  <span>Explore Telemetry</span>
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
            <span className="font-bold text-foreground">Supervisory Notice:</span> Administrative actions across parcels, hub manifests, and merchant financial payouts are permanently recorded in immutable audit logs with operator timestamp and IP fingerprinting.
          </p>
        </div>
      </Card>
    </div>
  );
}
