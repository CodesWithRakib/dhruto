"use client";

import * as React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";

export interface CustomerTrackingViewProps {
  initialCode?: string;
}

export function CustomerTrackingView({ initialCode }: CustomerTrackingViewProps) {
  const t = useTranslations("Customer");

  return (
    <div className="space-y-6">
      {initialCode ? (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-fit gap-2 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Link href={CUSTOMER_ROUTES.dashboard}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{t("backToDashboard")}</span>
            </Link>
          </Button>
        </div>
      ) : (
        <PageHeader
          title={t("trackingPageTitle")}
          description={t("trackingPageSubtitle")}
        />
      )}

      <div>
        <PublicTrackingView
          initialCode={initialCode}
          showIntro={!initialCode}
          className="space-y-6"
        />
      </div>
    </div>
  );
}
