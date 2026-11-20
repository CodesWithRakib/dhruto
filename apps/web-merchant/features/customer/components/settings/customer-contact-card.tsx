"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";

/** The SMS a recipient actually receives (see outbox fan-out + delivery OTP). */
const SMS_EVENTS = ["smsOutForDelivery", "smsDelivered", "smsFailed"] as const;

export function CustomerContactCard({ phone }: { phone: string }) {
  const t = useTranslations("Customer.settings");
  return (
    <section className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-4" aria-labelledby="customer-contact-title">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
          <MessageSquareText className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 id="customer-contact-title" className="text-sm font-bold text-foreground">{t("contactTitle")}</h3>
          <p className="text-caption text-muted-foreground">
            {t("contactSubtitle", { phone: phone || "—" })}
          </p>
        </div>
      </div>
      <ul className="space-y-2 text-xs">
        {SMS_EVENTS.map((key) => (
          <li key={key} className="rounded-xl bg-surface-muted/40 px-3 py-2 text-foreground">
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">{t("contactPerParcel")}</p>
    </section>
  );
}
