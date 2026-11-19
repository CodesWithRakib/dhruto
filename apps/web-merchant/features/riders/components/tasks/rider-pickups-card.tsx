"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Phone, Store } from "lucide-react";
import { Button } from "@dhruto/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { useConfirmPickupMutation, useGetMyPickupsQuery } from "../../api/riders.api";

/**
 * First-mile pickups assigned to this rider, one card per merchant visit.
 * "Confirm pickup" marks those parcels PICKED_UP; the hub scans them in next.
 * Renders nothing when there are no assigned pickups.
 */
export function RiderPickupsCard() {
  const t = useTranslations("Rider.pickups");
  const { data } = useGetMyPickupsQuery(undefined, { pollingInterval: 60000, skipPollingIfUnfocused: true });
  const [confirm, { isLoading }] = useConfirmPickupMutation();
  const [busyMerchant, setBusyMerchant] = React.useState<string | null>(null);
  const groups = data?.data ?? [];
  if (groups.length === 0) return null;

  const onConfirm = async (merchantId: string, parcelIds: string[]) => {
    setBusyMerchant(merchantId);
    try {
      const res = await confirm({ parcelIds }).unwrap();
      toast.success(t("confirmed", { count: res.data?.pickedUp ?? parcelIds.length }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("confirmFailed")));
    } finally {
      setBusyMerchant(null);
    }
  };

  return (
    <section className="rounded-3xl bg-surface p-5 sm:p-6 space-y-3" aria-labelledby="rider-pickups-title">
      <h2 id="rider-pickups-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("title", { count: groups.reduce((n, g) => n + g.parcels.length, 0) })}
      </h2>
      {groups.map((g) => (
        <div key={g.merchantId} className="rounded-2xl bg-surface-muted p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Store className="h-4 w-4 text-primary" aria-hidden="true" />
            {g.merchantName}
          </p>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {g.pickupAddress}
          </p>
          <a href={`tel:${g.contactPhone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {g.contactPhone}
          </a>
          <ul className="space-y-1 text-xs">
            {g.parcels.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span className="font-mono font-semibold">{p.trackingCode}</span>
                <span className="text-muted-foreground">{p.parcelDescription ?? `${p.weightKg} kg`}</span>
                {p.pickupInstructions ? (
                  <span className="w-full rounded-lg bg-warning-soft px-2 py-1 text-warning-soft-foreground">
                    {p.pickupInstructions}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <Button
            className="w-full gap-2"
            disabled={isLoading}
            onClick={() => onConfirm(g.merchantId, g.parcels.map((p) => p.id))}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {busyMerchant === g.merchantId ? t("confirming") : t("confirm", { count: g.parcels.length })}
          </Button>
        </div>
      ))}
    </section>
  );
}
