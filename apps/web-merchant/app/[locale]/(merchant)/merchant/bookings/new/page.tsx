import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/features/parcels/components/booking-form";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { ArrowLeft } from "lucide-react";
import { MERCHANT_ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New Parcel Booking | Dhruto Express",
  description: "Create and confirm a single parcel delivery booking with instant intelligent pricing.",
};

export default async function NewBookingPage() {
  const t = await getTranslations("BookingForm");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] space-y-6 pb-12">
      <DashboardCanvasBg />

      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={MERCHANT_ROUTES.parcels}>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs rounded-xl">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>All Shipments</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="relative z-10">
        <BookingForm />
      </div>
    </div>
  );
}
