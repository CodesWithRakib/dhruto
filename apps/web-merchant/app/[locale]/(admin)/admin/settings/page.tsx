"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import {
  Server,
  Layers,
  Wallet,
  Bike,
  Warehouse,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { ADMIN_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";

export default function AdminSettingsPage() {
  const t = useTranslations("Admin.settings");
  const authUser = useAppSelector((s) => s.auth.user);

  return (
    <div className="relative w-full space-y-6 pb-6">
      <DashboardCanvasBg />
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Administrator Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-surface-elevated p-6 sm:p-8 space-y-6">
            <div className="pb-1">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                {t("identityTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t("identitySubtitle")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-surface-muted/60 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">{authUser?.name || t("systemAdmin")}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                      {authUser?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{authUser?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-muted/60 p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("privilegeLevel")}
                  </p>
                  <p className="text-sm font-bold text-foreground">{t("globalSupervisor")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("privilegeDescription")}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-muted/60 p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("sessionSecurity")}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t("activeVerified")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("securityDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Administration Links */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-elevated p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Server className="h-4 w-4 text-primary" />
              {t("systemSurfaces")}
            </h3>

            <div className="space-y-2">
              <Link
                href="/admin/integrations"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>{t("integrationsDlq")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.finance}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>{t("financialConsole")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.rider}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Bike className="h-4 w-4 text-primary" />
                  <span>{t("riderFleet")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.hub}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <span>{t("hubInfrastructure")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
