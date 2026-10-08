import React from "react";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/features/marketing/components/page-hero";
import { TrackingQuickSearch } from "@/features/marketing/components/tracking-quick-search";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Shipment Tracking — Dhruto Express",
  description: "View real-time delivery milestones and location of your parcel.",
};

export default async function TrackCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;
  const t = await getTranslations("Tracking");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("searchTitle")}
        description={t("searchSubtitle")}
        align="center"
        tone="light"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 font-mono text-xs font-semibold uppercase text-primary">
            {code}
          </span>
        }
      >
        <div className="mx-auto mt-2 w-full max-w-xl rounded-2xl border border-border/60 bg-surface/80 p-3 shadow-lift backdrop-blur-sm">
          <TrackingQuickSearch />
        </div>
      </PageHero>

      <PublicTrackingView initialCode={code} showIntro={false} />
    </>
  );
}
