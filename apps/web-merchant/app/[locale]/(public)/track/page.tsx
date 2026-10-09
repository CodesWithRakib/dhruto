import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Truck } from "lucide-react";
import { CTASection } from "@/features/marketing/components/blocks";
import { TrackHero } from "@/features/tracking/components/track-hero";
import { TrackFeaturesBento } from "@/features/tracking/components/track-features-bento";
import { TrackProtocol } from "@/features/tracking/components/track-protocol";

export const metadata: Metadata = {
  title: "Track Shipment — Dhruto Express",
  description: "Track your parcel delivery progress across Bangladesh with live status updates.",
};

export default async function TrackSearchPage() {
  const t = await getTranslations("Tracking");

  return (
    <>
      {/* High-Tech Telemetry Cockpit & Radar Hero */}
      <TrackHero />

      {/* 4-Column Cyber-Logistics Telemetry Bento */}
      <TrackFeaturesBento />

      {/* 3-Step Journey Protocol & Privacy Shield */}
      <TrackProtocol />

      {/* High-Conversion Merchant CTA */}
      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Truck }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
