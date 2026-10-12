"use client";

import * as React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";

export interface CustomerTrackingViewProps {
  initialCode?: string;
}

export function CustomerTrackingView({ initialCode }: CustomerTrackingViewProps) {
  const t = useTranslations("Customer");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("trackingPageTitle")}
        description={t("trackingPageSubtitle")}
      />
      <div className="rounded-3xl border border-border/80 bg-surface p-4 sm:p-6 shadow-soft">
        <PublicTrackingView initialCode={initialCode} showIntro={false} />
      </div>
    </div>
  );
}
