import React from "react";
import type { FieldErrors } from "react-hook-form";
import { MapPin } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@dhruto/ui";
import type { ParcelBookingInput } from "@dhruto/contracts";
import type { ParcelBookingControl } from "../../hooks/use-parcel-booking";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";
import { BookingSectionWrapper } from "./booking-section-wrapper";

interface BookingDestinationSectionProps {
  control: ParcelBookingControl;
  district: string;
  errors: FieldErrors<ParcelBookingInput>;
  isLoading: boolean;
  t: (key: string) => string;
}

export function BookingDestinationSection({
  control,
  district,
  errors,
  isLoading,
  t,
}: BookingDestinationSectionProps) {
  return (
    <BookingSectionWrapper
      icon={MapPin}
      title={t("sectionDestination")}
      description={t("sectionDestinationHint")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("district")}</FormLabel>
              <FormControl>
                <DistrictSelect
                  value={field.value}
                  onChange={(newDist) => {
                    field.onChange(newDist);
                  }}
                  disabled={isLoading}
                  placeholder={t("districtPlaceholder")}
                  error={!!errors.district}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="thana"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("thana")}</FormLabel>
              <FormControl>
                <ThanaSelect
                  districtName={district}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLoading}
                  placeholder={t("thanaPlaceholder")}
                  error={!!errors.thana}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="deliveryAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-semibold text-foreground">{t("address")}</FormLabel>
            <FormControl>
              <Input
                autoComplete="street-address"
                placeholder={t("addressPlaceholder")}
                disabled={isLoading}
                className="rounded-xl bg-surface-muted/50 focus:bg-surface-elevated transition-colors"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </BookingSectionWrapper>
  );
}
