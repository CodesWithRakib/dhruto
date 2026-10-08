import React from "react";
import { Truck, Banknote, MapPin, Radar, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

const SERVICE_ICONS = [Truck, Banknote, MapPin, Radar];
const SERVICE_TAGS = ["Express Doorstep", "100% Guaranteed", "Smart Geocoding", "Live Milestones"];

export function ServicesSection() {
  const t = useTranslations("Home");
  const items = (t.raw("services.items") as { title: string; description: string }[]) || [];

  return (
    <section id="services" className="relative py-16 sm:py-24 overflow-hidden">
      <div className="dhruto-container relative z-10">
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <span>{t("services.eyebrow")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground text-balance">
            {t("services.title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
            {t("services.description")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = SERVICE_ICONS[index] ?? Truck;
            const tag = SERVICE_TAGS[index] ?? "Express";
            const indexFormatted = String(index + 1).padStart(2, "0");

            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
              >
                {/* Top ambient glow line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground/60 group-hover:text-primary transition-colors">
                      {indexFormatted}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    <span className="inline-block rounded-md bg-surface-muted/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {tag}
                    </span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-body-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/30 flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-2 group-hover:translate-x-0">
                  <span>Learn more</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
