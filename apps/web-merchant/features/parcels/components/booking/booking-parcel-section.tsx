import React from "react";
import type { Control } from "react-hook-form";
import { Package } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@dhruto/ui";
import type { ParcelBooking } from "@dhruto/contracts";
import { BookingSectionWrapper } from "./booking-section-wrapper";

interface BookingParcelSectionProps {
  control: Control<ParcelBooking>;
  isLoading: boolean;
  t: (key: string) => string;
}

export function BookingParcelSection({
  control,
  isLoading,
  t,
}: BookingParcelSectionProps) {
  return (
    <BookingSectionWrapper
      icon={Package}
      title={t("sectionParcel")}
      description={t("sectionParcelHint")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("weight")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  inputMode="decimal"
                  placeholder={t("weightPlaceholder")}
                  disabled={isLoading}
                  className="rounded-xl border-border/80 bg-surface-muted/50 focus:bg-surface-elevated transition-colors tabular-nums"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-caption text-muted-foreground">{t("weightHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="parcelDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("parcelDescription")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("parcelDescriptionPlaceholder")}
                  disabled={isLoading}
                  className="rounded-xl border-border/80 bg-surface-muted/50 focus:bg-surface-elevated transition-colors"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </BookingSectionWrapper>
  );
}
