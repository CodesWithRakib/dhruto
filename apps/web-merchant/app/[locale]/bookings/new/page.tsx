import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "../../../../features/parcels/components/booking-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New Parcel Booking",
  description: "Create and confirm a single parcel delivery booking.",
};

export default async function NewBookingPage() {
  const t = await getTranslations("BookingForm");

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        className="mx-auto max-w-xl text-center"
      />
      <BookingForm />
    </div>
  );
}
