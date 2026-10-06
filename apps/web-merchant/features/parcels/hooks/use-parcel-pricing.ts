"use client";

import { useEffect, useState } from "react";
import type { PricingResult } from "@dhruto/contracts";
import { useCalculatePricingMutation } from "../api/parcels.api";

export interface UseParcelPricingArgs {
  district: string;
  thana: string;
  weight: number;
  codAmount: number;
  /** Skip the request until the form is worth pricing (e.g. district chosen). */
  enabled?: boolean;
}

export interface UseParcelPricingResult {
  pricing: PricingResult | null;
  isCalculating: boolean;
  /** True when the backend rejected the quote (invalid input or network). */
  isError: boolean;
}

/** Debounce for pricing requests, in milliseconds. */
const PRICING_DEBOUNCE_MS = 350;

/**
 * Asks the backend for an authoritative delivery quote.
 *
 * The pricing formula lives exclusively in the API (`POST /pricing/calculate`);
 * this hook debounces destination/weight/COD changes and exposes the returned
 * breakdown so the UI can *display* it. No fee is ever computed in the browser.
 */
export function useParcelPricing({
  district,
  thana,
  weight,
  codAmount,
  enabled = true,
}: UseParcelPricingArgs): UseParcelPricingResult {
  const [calculatePricing, { isLoading, isError }] = useCalculatePricingMutation();
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isError_, setError] = useState(false);

  const canQuote = enabled && district.trim().length > 0 && weight > 0;

  useEffect(() => {
    if (!canQuote) {
      setPricing(null);
      setError(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await calculatePricing({
          district: district.trim(),
          thana: thana.trim() || undefined,
          weight,
          codAmount: Number.isFinite(codAmount) && codAmount > 0 ? codAmount : 0,
        }).unwrap();

        if (cancelled) return;
        setPricing(response.data ?? null);
        setError(false);
      } catch {
        if (cancelled) return;
        setError(true);
      }
    }, PRICING_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canQuote, calculatePricing, codAmount, district, thana, weight]);

  return {
    pricing,
    isCalculating: isLoading,
    isError: isError || isError_,
  };
}
