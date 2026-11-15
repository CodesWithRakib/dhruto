import React from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@dhruto/ui";

interface BookingActionsBarProps {
  isLoading: boolean;
  onReset: () => void;
  t: (key: string) => string;
}

export function BookingActionsBar({
  isLoading,
  onReset,
  t,
}: BookingActionsBarProps) {
  return (
    <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border/70 bg-surface-muted/40 p-4 sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={isLoading}
        className="rounded-xl border-border/80 gap-2 hover:bg-surface-elevated transition-colors"
      >
        <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t("reset")}
      </Button>
      <Button
        type="submit"
        form="parcel-booking-form"
        disabled={isLoading}
        className="gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
    </div>
  );
}
