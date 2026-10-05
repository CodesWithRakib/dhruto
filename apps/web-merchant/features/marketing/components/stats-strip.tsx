import React from "react";
import { MapPin, Building, Truck, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function StatsStrip() {
  const t = useTranslations("Home");

  const stats = [
    {
      value: t("stats.coverage"),
      label: t("stats.coverageLabel"),
      icon: MapPin,
    },
    {
      value: t("stats.thanas"),
      label: t("stats.thanasLabel"),
      icon: Building,
    },
    {
      value: t("stats.daily"),
      label: t("stats.dailyLabel"),
      icon: Truck,
    },
    {
      value: t("stats.rate"),
      label: t("stats.rateLabel"),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="dhruto-container py-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="text-caption sm:text-body-sm text-muted-foreground font-medium">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
