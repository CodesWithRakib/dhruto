"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardDescription, CardTitle } from "@dhruto/ui";
import { ArrowRight, Bike, Package, Wallet, Warehouse } from "lucide-react";
import { Link } from "@/lib/navigation";
import { ADMIN_ROUTES } from "@/config/routes";

/**
 * Admin supervision console.
 *
 * The admin role supervises the same operational surfaces merchants, hubs and
 * riders use. Rather than inventing tools the backend does not expose, this is
 * a control centre that routes the operator into those real surfaces under the
 * `/admin` namespace.
 */
const SECTIONS = [
  { href: ADMIN_ROUTES.parcels, labelKey: "parcels", icon: Package },
  { href: ADMIN_ROUTES.finance, labelKey: "finance", icon: Wallet },
  { href: ADMIN_ROUTES.hub, labelKey: "hub", icon: Warehouse },
  { href: ADMIN_ROUTES.rider, labelKey: "rider", icon: Bike },
] as const;

export function AdminConsole() {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-h1 text-foreground">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="flex items-center justify-between gap-4 transition-colors group-hover:bg-surface-muted">
                <div className="flex items-center gap-3 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle className="text-h4 text-foreground">
                      {t(`${section.labelKey}.title`)}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {t(`${section.labelKey}.description`)}
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight
                  className="mr-5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
