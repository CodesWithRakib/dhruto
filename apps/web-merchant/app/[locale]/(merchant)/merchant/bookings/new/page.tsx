import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/features/parcels/components/booking-form";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New Parcel Booking | Dhruto Express",
  description: "Create and confirm a single parcel delivery booking with instant intelligent pricing.",
};

export default async function NewBookingPage() {
  const t = await getTranslations("BookingForm");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] space-y-6 py-6 sm:py-8">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Atmospheric Header & Engine Status Badge */}
      <div className="relative mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-caption font-semibold text-primary backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Zap className="h-3 w-3" />
          <span>{t("engineOnline")}</span>
        </div>

        <h1 className="text-display-sm sm:text-display-md font-bold text-foreground tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="mx-auto max-w-xl text-body-sm sm:text-body-md text-muted-foreground">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Booking Form Cockpit */}
      <div className="relative z-10">
        <BookingForm />
      </div>
    </div>
  );
}
