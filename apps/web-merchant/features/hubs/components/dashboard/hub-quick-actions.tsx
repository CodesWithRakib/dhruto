"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Inbox, Package, ScanLine, Truck, Wallet } from "lucide-react";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";

export function HubQuickActions() {
  const t = useTranslations("Hub");

  const quickActions = [
    {
      href: HUB_ROUTES.scanner,
      title: t("dashboard.scanParcel"),
      description: t("dashboard.scanParcelDescription"),
      icon: ScanLine,
    },
    {
      href: HUB_ROUTES.parcels,
      title: t("dashboard.lookupParcel"),
      description: t("dashboard.lookupParcelDescription"),
      icon: Inbox,
    },
    {
      href: HUB_ROUTES.bags,
      title: t("dashboard.createBag"),
      description: t("dashboard.createBagDescription"),
      icon: Package,
    },
    {
      href: HUB_ROUTES.manifests,
      title: t("dashboard.createManifest"),
      description: t("dashboard.createManifestDescription"),
      icon: Truck,
    },
    {
      href: HUB_ROUTES.cash,
      title: t("dashboard.cashDesk"),
      description: t("dashboard.cashDeskDescription"),
      icon: Wallet,
    },
  ];

  return (
    <section aria-label={t("dashboard.quickActions")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative flex flex-col justify-between rounded-3xl bg-card/90 backdrop-blur-md p-4 transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* Specular top highlight */}

            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {action.title}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                {action.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
