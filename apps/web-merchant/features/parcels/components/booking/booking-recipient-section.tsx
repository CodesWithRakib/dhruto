import React from "react";
import { User } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@dhruto/ui";
import type { ParcelBookingControl } from "../../hooks/use-parcel-booking";
import { BookingSectionWrapper } from "./booking-section-wrapper";

interface BookingRecipientSectionProps {
  control: ParcelBookingControl;
  isLoading: boolean;
  t: (key: string) => string;
}

export function BookingRecipientSection({ control, isLoading, t }: BookingRecipientSectionProps) {
  return (
    <BookingSectionWrapper
      icon={User}
      title={t("sectionRecipient")}
      description={t("sectionRecipientHint")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="recipientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("recipientName")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder={t("recipientNamePlaceholder")}
                  disabled={isLoading}
                  className="rounded-xl border-border/80 bg-surface-muted/50 focus:bg-surface-elevated transition-colors"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="recipientPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-foreground">{t("recipientPhone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("recipientPhonePlaceholder")}
                  disabled={isLoading}
                  className="rounded-xl border-border/80 bg-surface-muted/50 focus:bg-surface-elevated transition-colors"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-caption text-muted-foreground">
                {t("recipientPhoneHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </BookingSectionWrapper>
  );
}
