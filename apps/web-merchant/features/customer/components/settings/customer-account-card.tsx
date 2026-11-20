"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

interface CustomerAccountCardProps {
  name: string;
  phone: string;
}

export function CustomerAccountCard({ name, phone }: CustomerAccountCardProps) {
  const t = useTranslations("Customer.settings");
  const rows: Array<[string, string, string?]> = [
    [t("name"), name || "—"],
    [t("phone"), phone || "—", "font-mono"],
  ];
  return (
    <section className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-4" aria-labelledby="customer-account-title">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 id="customer-account-title" className="text-sm font-bold text-foreground">{t("accountTitle")}</h3>
          <p className="text-caption text-muted-foreground">{t("accountSubtitle")}</p>
        </div>
      </div>
      <dl className="space-y-2.5 text-xs">
        {rows.map(([label, value, cls]) => (
          <div key={label} className="flex justify-between gap-3 rounded-xl bg-surface-muted/40 px-3 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={`font-bold text-foreground ${cls ?? ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
