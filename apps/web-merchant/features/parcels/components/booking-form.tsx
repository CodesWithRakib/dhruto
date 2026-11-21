"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button, Form } from "@dhruto/ui";
import type { AddressParseResult } from "@dhruto/contracts";
import { AlertCard } from "@/components/data-display/cards";
import { useParcelBooking } from "../hooks/use-parcel-booking";
import { useParcelPricing } from "../hooks/use-parcel-pricing";
import { PricingSummary } from "./booking/pricing-summary";
import { BookingSuccess } from "./booking/booking-success";
import { SmartAddressFill } from "./booking/smart-address-fill";
import { BookingRecipientSection } from "./booking/booking-recipient-section";
import { BookingDestinationSection } from "./booking/booking-destination-section";
import { BookingParcelSection } from "./booking/booking-parcel-section";
import { BookingCodSection } from "./booking/booking-cod-section";

export function BookingForm() {
  const t = useTranslations("BookingForm");
  const tErrors = useTranslations("ApiErrors");

  const { form, onSubmit, isLoading, createdParcel, serverError, serverErrorKey, resetForm } =
    useParcelBooking();

  const [showSmartFill, setShowSmartFill] = useState(false);

  const district = form.watch("district") ?? "";
  const thana = form.watch("thana") ?? "";
  const weight = Number(form.watch("weight")) || 0;
  const codAmount = Number(form.watch("codAmount")) || 0;

  const {
    pricing,
    isCalculating,
    isError: isPricingError,
  } = useParcelPricing({
    district,
    thana,
    weight,
    codAmount,
  });

  const handleApplyParsedAddress = (result: AddressParseResult, rawAddress: string) => {
    form.setValue("district", result.district, { shouldValidate: true, shouldDirty: true });
    form.setValue("thana", result.thana, { shouldValidate: true, shouldDirty: true });
    form.setValue("deliveryAddress", rawAddress, { shouldValidate: true, shouldDirty: true });
  };

  if (createdParcel) {
    return <BookingSuccess parcel={createdParcel} onBookAnother={resetForm} />;
  }

  const displayedError = serverErrorKey ? tErrors(serverErrorKey) : serverError;

  return (
    <div className="w-full">
      <Form {...form}>
        <form id="parcel-booking-form" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Details */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-surface-elevated p-5 sm:p-6 space-y-5">
                {/* Form Toolbar */}
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Shipment Specifications
                  </span>
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    aria-expanded={showSmartFill}
                    onClick={() => setShowSmartFill((open) => !open)}
                    className="h-8 rounded-lg gap-1.5 text-xs font-semibold"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {showSmartFill ? t("smartFillHide") : t("smartFillToggle")}
                  </Button>
                </div>

                {showSmartFill ? <SmartAddressFill onApply={handleApplyParsedAddress} /> : null}

                {displayedError ? (
                  <AlertCard tone="danger">
                    <span className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block font-semibold">{t("submissionError")}</span>
                        <span>{displayedError}</span>
                      </span>
                    </span>
                  </AlertCard>
                ) : null}

                <BookingRecipientSection
                  control={form.control}
                  isLoading={isLoading}
                  t={t}
                />

                <BookingDestinationSection
                  control={form.control}
                  district={district}
                  errors={form.formState.errors}
                  isLoading={isLoading}
                  t={t}
                />

                <BookingParcelSection
                  control={form.control}
                  isLoading={isLoading}
                  t={t}
                />

                <BookingCodSection
                  control={form.control}
                  isLoading={isLoading}
                  t={t}
                />
              </div>
            </div>

            {/* Right Column: Live Pricing & Action Cockpit */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-24">
              <PricingSummary
                pricing={pricing}
                isCalculating={isCalculating}
                isError={isPricingError}
                codAmount={codAmount}
              />

              <div className="rounded-2xl bg-surface-elevated p-4.5 space-y-3">
                <Button
                  type="submit"
                  form="parcel-booking-form"
                  disabled={isLoading}
                  className="w-full h-11 gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary-hover active:scale-[0.98] transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {t("confirming")}
                    </>
                  ) : (
                    <>
                      {t("confirm")}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isLoading}
                  className="w-full h-10 rounded-xl gap-2 font-medium"
                >
                  <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {t("reset")}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground pt-1">
                  Tracking code is automatically allocated upon confirmation.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
