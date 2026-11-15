import React from "react";
import type { Control } from "react-hook-form";
import { Wallet } from "lucide-react";
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

interface BookingCodSectionProps {
  control: Control<ParcelBooking>;
  isLoading: boolean;
  t: (key: string) => string;
}

export function BookingCodSection({
  control,
  isLoading,
  t,
}: BookingCodSectionProps) {
  return (
    <BookingSectionWrapper
      icon={Wallet}
      title={t("sectionCod")}
      description={t("sectionCodHint")}
    >
      <FormField
        control={control}
        name="codAmount"
        render={({ field }) => (
          <FormItem className="max-w-xs">
            <FormLabel className="font-semibold text-foreground">{t("cod")}</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-sm font-bold text-muted-foreground select-none">
                  ৳
                </span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="500000"
                  inputMode="numeric"
                  placeholder="0"
                  disabled={isLoading}
                  className="rounded-xl border-border/80 bg-surface-muted/50 focus:bg-surface-elevated transition-colors pl-8 tabular-nums font-semibold"
                  {...field}
                />
              </div>
            </FormControl>
            <FormDescription className="text-caption text-muted-foreground">{t("codHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </BookingSectionWrapper>
  );
}
