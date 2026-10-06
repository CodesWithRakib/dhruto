"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Search, Sparkles } from "lucide-react";
import { Badge, Button, Input } from "@dhruto/ui";
import type { AddressParseResult } from "@dhruto/contracts";
import { useParseAddressMutation } from "@/features/intelligence/api/intelligence.api";
import { getApiErrorMessage } from "@/lib/api-error";

export interface SmartAddressFillProps {
  /** Applies the parsed district/thana/address to the booking form. */
  onApply: (result: AddressParseResult, rawAddress: string) => void;
}

/**
 * Optional bilingual address helper. It calls the Phase 0 address parser and
 * writes the result back into the booking form; the merchant can always edit
 * each field manually.
 */
export function SmartAddressFill({ onApply }: SmartAddressFillProps) {
  const t = useTranslations("BookingForm");
  const [rawAddress, setRawAddress] = useState("");
  const [parsed, setParsed] = useState<AddressParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [parseAddress, { isLoading }] = useParseAddressMutation();

  const handleParse = async () => {
    setErrorMessage(null);
    const query = rawAddress.trim();
    if (query.length < 3) {
      setErrorMessage(t("smartFillTooShort"));
      return;
    }

    try {
      const response = await parseAddress({ rawAddress: query }).unwrap();
      if (response.data) {
        setParsed(response.data);
        onApply(response.data, query);
      }
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, t("smartFillError")));
    }
  };

  const confidenceVariant =
    parsed?.confidenceTier === "HIGH"
      ? "success"
      : parsed?.confidenceTier === "MEDIUM"
        ? "warning"
        : "destructive";

  return (
    <div className="mb-6 space-y-3 rounded-md border border-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("smartFillTitle")}
        </span>
        <span className="text-caption text-muted-foreground">{t("smartFillHint")}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={rawAddress}
          onChange={(event) => setRawAddress(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleParse();
            }
          }}
          placeholder={t("smartFillPlaceholder")}
          aria-label={t("smartFillTitle")}
          disabled={isLoading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleParse()}
          disabled={isLoading || !rawAddress.trim()}
          className="shrink-0 gap-1.5"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? t("smartFillParsing") : t("smartFillButton")}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" className="text-caption text-danger">
          {errorMessage}
        </p>
      ) : null}

      {parsed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <span className="flex items-center gap-1.5 text-caption text-foreground">
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t("smartFillDetected", { thana: parsed.thana, district: parsed.district })}
          </span>
          <Badge variant={confidenceVariant}>
            {t("smartFillConfidence", { score: parsed.confidenceScore })}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
