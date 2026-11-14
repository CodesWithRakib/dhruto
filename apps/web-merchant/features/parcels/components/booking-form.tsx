"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  MapPin,
  Package,
  Phone,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@dhruto/ui";
import type { AddressParseResult } from "@dhruto/contracts";
import { AlertCard } from "@/components/data-display/cards";
import { useParcelBooking } from "../hooks/use-parcel-booking";
import { useParcelPricing } from "../hooks/use-parcel-pricing";
import { PricingSummary } from "./booking/pricing-summary";
import { BookingSuccess } from "./booking/booking-success";
import { SmartAddressFill } from "./booking/smart-address-fill";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";

/** Section wrapper: one heading + one grouped set of fields. */
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-2.5 pb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-body-sm font-bold text-foreground">{title}</p>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </fieldset>
  );
}

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
      <div className="rounded-3xl bg-surface-elevated p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
              <p className="text-body-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showSmartFill}
            onClick={() => setShowSmartFill((open) => !open)}
            className="rounded-xl"
          >
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
              <Section
                icon={User}
                title={t("sectionRecipient")}
                description={t("sectionRecipientHint")}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientName")}</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="name"
                            placeholder={t("recipientNamePlaceholder")}
                            disabled={isLoading}
                            className="rounded-2xl border-0 bg-surface-muted/60"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientPhone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder={t("recipientPhonePlaceholder")}
                            disabled={isLoading}
                            className="rounded-2xl border-0 bg-surface-muted/60"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{t("recipientPhoneHint")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              <Section
                icon={MapPin}
                title={t("sectionDestination")}
                description={t("sectionDestinationHint")}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("district")}</FormLabel>
                        <FormControl>
                          <DistrictSelect
                            value={field.value}
                            onChange={(newDist) => {
                              field.onChange(newDist);
                            }}
                            disabled={isLoading}
                            placeholder={t("districtPlaceholder")}
                            error={!!form.formState.errors.district}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="thana"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("thana")}</FormLabel>
                        <FormControl>
                          <ThanaSelect
                            districtName={district}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isLoading}
                            placeholder={t("thanaPlaceholder")}
                            error={!!form.formState.errors.thana}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("address")}</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="street-address"
                          placeholder={t("addressPlaceholder")}
                          disabled={isLoading}
                          className="rounded-2xl border-0 bg-surface-muted/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section
                icon={Package}
                title={t("sectionParcel")}
                description={t("sectionParcelHint")}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("weight")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="50"
                            inputMode="decimal"
                            placeholder={t("weightPlaceholder")}
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{t("weightHint")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parcelDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("parcelDescription")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("parcelDescriptionPlaceholder")}
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              <Section icon={Wallet} title={t("sectionCod")} description={t("sectionCodHint")}>
                <FormField
                  control={form.control}
                  name="codAmount"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>{t("cod")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="500000"
                          inputMode="numeric"
                          placeholder="0"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{t("codHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <PricingSummary
                pricing={pricing}
                isCalculating={isCalculating}
                isError={isPricingError}
                codAmount={codAmount}
              />
            </form>
          </Form>

          <div className="flex flex-col-reverse gap-3 rounded-2xl bg-surface-muted/30 p-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading} className="rounded-xl">
              {t("reset")}
            </Button>
            <Button type="submit" form="parcel-booking-form" disabled={isLoading} className="gap-2 rounded-xl">
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
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-caption text-muted-foreground">
        <Phone className="h-3 w-3" aria-hidden="true" />
        {t("privacyNote")}
      </p>
    </div>
  );
}
