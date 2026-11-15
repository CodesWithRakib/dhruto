"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Package, Sparkles } from "lucide-react";
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
import { BookingActionsBar } from "./booking/booking-actions-bar";

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
    <div className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
        {/* Specular highlight border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Cockpit Card Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shrink-0 mt-0.5">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-h4 font-bold text-foreground tracking-tight">{t("title")}</h2>
              <p className="text-body-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showSmartFill}
            onClick={() => setShowSmartFill((open) => !open)}
            className="rounded-xl border-border/80 gap-2 hover:bg-surface-elevated self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {showSmartFill ? t("smartFillHide") : t("smartFillToggle")}
          </Button>
        </div>

        <div className="space-y-6">
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

          <Form {...form}>
            <form id="parcel-booking-form" onSubmit={onSubmit} noValidate className="space-y-6">
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

              <PricingSummary
                pricing={pricing}
                isCalculating={isCalculating}
                isError={isPricingError}
                codAmount={codAmount}
              />
            </form>
          </Form>

          <BookingActionsBar
            isLoading={isLoading}
            onReset={() => form.reset()}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
