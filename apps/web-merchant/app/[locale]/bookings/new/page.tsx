import React from "react";
import type { Metadata } from "next";
import { BookingForm } from "../../../../features/parcels/components/booking-form";

export const metadata: Metadata = {
  title: "New Parcel Booking — Dhruto Merchant",
  description: "Create and confirm a single parcel delivery booking.",
};

export default function NewBookingPage() {
  return (
    <div className="py-4 space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Book a Parcel
        </h1>
        <p className="text-sm text-slate-500">
          Fill in the recipient and package details below. Delivery fees are automatically estimated.
        </p>
      </div>

      <BookingForm />
    </div>
  );
}
