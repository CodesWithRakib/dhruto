"use client";

import React, { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Lock, Scan } from "lucide-react";
import { Button, Input } from "@dhruto/ui";

interface BagAddParcelCardProps {
  trackingInput: string;
  setTrackingInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenSeal: () => void;
  isAdding: boolean;
}

export const BagAddParcelCard = forwardRef<HTMLInputElement, BagAddParcelCardProps>(
  function BagAddParcelCard(
    { trackingInput, setTrackingInput, onSubmit, onOpenSeal, isAdding },
    ref
  ) {
    const t = useTranslations("Hub");

    return (
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-5 sm:p-6 space-y-4">
        {/* Specular top highlight */}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("bags.addParcel")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("bags.addParcelPlaceholder")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSeal}
            className="gap-1.5 rounded-xl bg-surface-muted/60 text-xs font-semibold hover:bg-surface-muted"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            {t("bags.seal")}
          </Button>
        </div>

        <form onSubmit={onSubmit} className="flex gap-2.5">
          <div className="relative flex-1">
            <Scan
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={ref}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={trackingInput}
              onChange={(event) => setTrackingInput(event.target.value)}
              placeholder={t("bags.addParcelPlaceholder")}
              aria-label={t("bags.addParcel")}
              disabled={isAdding}
              className="h-12 rounded-2xl bg-surface-muted/60 pl-11 font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground focus:bg-background"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isAdding || !trackingInput.trim()}
            className="h-12 rounded-2xl px-7 font-semibold"
          >
            {isAdding ? t("bags.adding") : t("bags.addParcel")}
          </Button>
        </form>
      </div>
    );
  }
);
