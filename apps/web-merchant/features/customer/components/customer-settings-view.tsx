"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { useAppSelector } from "@/store/hooks";
import { CustomerAccountCard } from "./settings/customer-account-card";
import { CustomerContactCard } from "./settings/customer-contact-card";

/**
 * Customer settings: who we deliver to and how we reach them.
 *
 * Only real, server-backed behaviour is shown. Delivery instructions and
 * reschedules are set per parcel (delivery preference on each delivery);
 * the former "saved addresses" and WhatsApp/email toggles lived only in
 * localStorage and never reached the server, so they were removed.
 */
export function CustomerSettingsView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  return (
    <div className="space-y-6">
      <PageHeader title={t("settingsPageTitle")} description={t("settingsPageSubtitle")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CustomerAccountCard name={authUser?.name || ""} phone={authUser?.phone || ""} />
        <CustomerContactCard phone={authUser?.phone || ""} />
      </div>
    </div>
  );
}
