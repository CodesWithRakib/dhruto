"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { useGetFleetRidersQuery, useAssignParcelToRiderMutation } from "../../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";

export interface AssignRiderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelId: string;
  trackingCode: string;
  hubId?: string;
  onAssigned: () => void;
}

/**
 * Controlled rider assignment: eligible riders with live task counts, one
 * explicit confirmation. The backend re-validates eligibility, hub match and
 * reassignment rules — the UI never decides authorization.
 */
export function AssignRiderDialog({
  open,
  onOpenChange,
  parcelId,
  trackingCode,
  hubId,
  onAssigned,
}: AssignRiderDialogProps) {
  const t = useTranslations("Rider");
  const [riderId, setRiderId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  // The API pages riders (default 20). Ask for the maximum and let staff search
  // by name or rider code, so riders beyond the first page stay assignable.
  const { data, isFetching } = useGetFleetRidersQuery(
    { hubId, search: debounced, limit: 100 },
    { skip: !open },
  );
  const [assign, { isLoading }] = useAssignParcelToRiderMutation();

  // Eligible riders, least busy first (spreads the day's workload).
  const riders = (data?.data ?? [])
    .filter((rider) => rider.status === "ACTIVE" || rider.status === "ON_DUTY")
    .sort((a, b) => a.activeTaskCount - b.activeTaskCount || a.name.localeCompare(b.name));

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!riderId) {
      toast.error(t("fleet.selectRiderRequired"));
      return;
    }
    try {
      const res = await assign({ parcelId, riderId }).unwrap();
      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        setRiderId("");
        onAssigned();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("fleet.assignRider")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-surface-elevated p-6">
        <DialogHeader>
          <DialogTitle>{t("fleet.assignRider")}</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">{trackingCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAssign} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="assign-rider-search" className="text-xs font-semibold text-muted-foreground">
              {t("fleet.searchRider")}
            </label>
            <Input
              id="assign-rider-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("fleet.searchRiderPlaceholder")}
              aria-busy={isFetching || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="assign-rider" className="text-xs font-semibold text-muted-foreground">
              {t("fleet.selectRider")} *
            </label>
            <Select
              value={riderId}
              onValueChange={setRiderId}
              required
            >
              <SelectTrigger id="assign-rider" className="w-full h-11 rounded-2xl">
                <SelectValue placeholder={t("fleet.selectRider")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {riders.map((rider) => (
                  <SelectItem key={rider.id} value={rider.id} className="rounded-xl">
                    {rider.name} ({rider.riderCode}) ·{" "}
                    {t("fleet.activeTasks", { count: rider.activeTaskCount })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !riderId} className="rounded-xl">
              {isLoading ? t("fleet.assigning") : t("fleet.confirmAssign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
