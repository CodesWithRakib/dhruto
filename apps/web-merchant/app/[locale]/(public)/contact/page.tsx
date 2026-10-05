import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin } from "lucide-react";
import { MarketingPage } from "@/features/marketing/components/marketing-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the Dhruto team about merchant onboarding, bulk shipping, pricing or support.",
  alternates: { canonical: "/contact" },
};

const SUPPORT_EMAIL = "support@dhruto.com";

export default async function ContactPage() {
  const t = await getTranslations("Contact");

  const channels = [
    {
      icon: Mail,
      title: t("email.title"),
      value: SUPPORT_EMAIL,
      detail: t("email.detail"),
      href: `mailto:${SUPPORT_EMAIL}`,
    },
    {
      icon: Clock,
      title: t("hours.title"),
      value: t("hours.value"),
      detail: t("hours.detail"),
    },
    {
      icon: MapPin,
      title: t("office.title"),
      value: t("office.value"),
      detail: t("office.detail"),
    },
  ];

  return (
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <ul className="grid gap-4 sm:grid-cols-3">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const body = (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-h4 text-foreground">{channel.title}</h2>
              <p className="mt-1 text-body font-medium text-foreground">{channel.value}</p>
              <p className="mt-0.5 text-body-sm text-muted-foreground text-pretty">
                {channel.detail}
              </p>
            </>
          );

          return (
            <li key={channel.title} className="rounded-lg border border-border bg-surface p-5">
              {channel.href ? (
                <a href={channel.href} className="block rounded-md">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-body text-muted-foreground text-pretty">{t("note")}</p>
    </MarketingPage>
  );
}
