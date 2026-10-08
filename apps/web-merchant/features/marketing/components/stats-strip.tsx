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
      badge: "Nationwide",
    },
    {
      value: t("stats.thanas"),
      label: t("stats.thanasLabel"),
      icon: Building,
      badge: "Deep Coverage",
    },
    {
      value: t("stats.daily"),
      label: t("stats.dailyLabel"),
      icon: Truck,
      badge: "High Capacity",
    },
    {
      value: t("stats.rate"),
      label: t("stats.rateLabel"),
      icon: CheckCircle2,
      badge: "Guaranteed",
    },
  ];

  return (
    <div className="dhruto-container py-6 sm:py-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-4 sm:p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-primary/50 hover:bg-surface/75 hover:-translate-y-1 hover:shadow-primary/10"
            >
              {/* Subtle top glow line */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center gap-3.5 sm:gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <p className="truncate text-caption sm:text-body-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
