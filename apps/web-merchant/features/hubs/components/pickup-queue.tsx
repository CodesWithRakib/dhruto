"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Package, Phone, Store, UserCheck } from "lucide-react";
import type { PickupRequestGroup } from "@dhruto/contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { EmptyState } from "@/components/feedback/states";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAssignPickupRiderMutation, useGetPickupRequestsQuery } from "../api/hubs.api";
import { useGetFleetRidersQuery } from "@/features/riders/api/riders.api";

/**
 * Merchant pickup requests routed to this hub (merchant pickup district ==
 * hub district), grouped per merchant so one rider collects a visit's parcels.
 */
export function PickupQueue({ hubId }: { hubId: string }) {
  const t = useTranslations("Hub.pickups");
  const { data, isLoading, isError, refetch } = useGetPickupRequestsQuery(hubId, {
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
  });
  const [assigning, setAssigning] = React.useState<PickupRequestGroup | null>(null);
  const groups = data?.data ?? [];

  if (isLoading) return <p role="status" className="p-8 text-center text-xs text-muted-foreground">{t("loading")}</p>;
  if (isError) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center space-y-3">
        <p className="text-sm text-danger">{t("loadFailed")}</p>
        <Button variant="outline" onClick={() => void refetch()}>{t("retry")}</Button>
      </div>
    );
  }
  if (groups.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.merchantId} className="rounded-3xl bg-surface p-5 sm:p-6 space-y-4" aria-label={g.merchantName}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                {g.merchantName}
              </h3>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {g.pickupAddress}
                  {g.pickupThana ? ` · ${g.pickupThana}` : ""}
                </span>
              </p>
              <a href={`tel:${g.contactPhone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {g.contactPhone}
              </a>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <span
                className={
                  g.assignedRiderName
                    ? "rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-soft-foreground"
                    : "rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-soft-foreground"
                }
              >
                {g.assignedRiderName ? t("assignedTo", { rider: g.assignedRiderName }) : t("awaitingRider")}
              </span>
              <Button size="sm" className="gap-1.5" onClick={() => setAssigning(g)}>
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {g.assignedRiderName ? t("reassign") : t("assign")}
              </Button>
            </div>
          </div>
          <ul className="space-y-2">
            {g.parcels.map((p) => (
              <li key={p.id} className="rounded-2xl bg-surface-muted p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {p.trackingCode}
                  </span>
                  <span className="text-muted-foreground">
                    {p.weightKg} kg{p.parcelDescription ? ` · ${p.parcelDescription}` : ""}
                  </span>
                </div>
                {p.pickupInstructions ? (
                  <p className="mt-1.5 rounded-xl bg-warning-soft px-2.5 py-1.5 text-warning-soft-foreground">
                    {p.pickupInstructions}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {assigning ? (
        <AssignPickupDialog hubId={hubId} group={assigning} onClose={() => setAssigning(null)} />
      ) : null}
    </div>
  );
}

function AssignPickupDialog({
  hubId,
  group,
  onClose,
}: {
  hubId: string;
  group: PickupRequestGroup;
  onClose: () => void;
}) {
  const t = useTranslations("Hub.pickups");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [riderId, setRiderId] = React.useState(group.assignedRiderId ?? "");
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const { data } = useGetFleetRidersQuery({ hubId, search: debounced, limit: 100 });
  const [assign, { isLoading }] = useAssignPickupRiderMutation();
  const riders = (data?.data ?? [])
    .filter((r) => r.status === "ACTIVE" || r.status === "ON_DUTY")
    .sort((a, b) => a.activeTaskCount - b.activeTaskCount || a.name.localeCompare(b.name));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderId) return;
    try {
      const res = await assign({ hubId, riderId, parcelIds: group.parcels.map((p) => p.id) }).unwrap();
      toast.success(t("assignedToast", { count: res.data?.assigned ?? group.parcels.length, rider: res.data?.riderName ?? "" }));
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("assignFailed")));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle", { merchant: group.merchantName })}</DialogTitle>
            <DialogDescription>{t("dialogDescription", { count: group.parcels.length })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="pickup-rider-search" className="text-xs font-semibold text-muted-foreground">
              {t("findRider")}
            </label>
            <Input id="pickup-rider-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("findRiderPlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pickup-rider" className="text-xs font-semibold text-muted-foreground">{t("rider")} *</label>
            <Select value={riderId} onValueChange={setRiderId} required>
              <SelectTrigger id="pickup-rider" className="h-11 rounded-2xl">
                <SelectValue placeholder={t("selectRider")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {riders.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="rounded-xl">
                    {r.name} ({r.riderCode}) · {t("activeTasks", { count: r.activeTaskCount })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!riderId || isLoading}>{isLoading ? t("assigning") : t("confirmAssign")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
