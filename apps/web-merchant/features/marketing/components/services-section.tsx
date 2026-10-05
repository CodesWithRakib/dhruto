import React from "react";
import { Truck, Banknote, MapPin, Radar } from "lucide-react";
import { useTranslations } from "next-intl";

const SERVICE_ICONS = [Truck, Banknote, MapPin, Radar];

export function ServicesSection() {
  const t = useTranslations("Home");
  const items = t.raw("services.items") as { title: string; description: string }[];

  return (
    <section id="services" className="py-16 sm:py-20 bg-surface-muted/40">
      <div className="dhruto-container">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10 sm:mb-12">
          <h2 className="text-h2 font-bold text-foreground text-balance">
            {t("services.title")}
          </h2>
          <p className="text-body text-muted-foreground text-pretty">
            {t("services.description")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = SERVICE_ICONS[index] ?? Truck;
            return (
              <div
                key={item.title}
                className="group relative rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-body-sm text-muted-foreground text-pretty leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
