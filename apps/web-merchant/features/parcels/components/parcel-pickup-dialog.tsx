"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
} from "@dhruto/ui";
import { Truck, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRequestPickupMutation } from "../api/parcels.api";
import { toast } from "sonner";

export interface ParcelPickupDialogProps {
  parcelId: string;
  trackingCode: string;
  pickupAddress?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PICKUP_WINDOWS = [
  { id: "today_afternoon", label: "Today — Afternoon (2:00 PM – 6:00 PM)" },
  { id: "tomorrow_morning", label: "Tomorrow — Morning (9:00 AM – 1:00 PM)" },
  { id: "tomorrow_afternoon", label: "Tomorrow — Afternoon (2:00 PM – 6:00 PM)" },
];

export function ParcelPickupDialog({
  parcelId,
  trackingCode,
  pickupAddress,
  isOpen,
  onClose,
  onSuccess,
}: ParcelPickupDialogProps) {
  const [selectedWindow, setSelectedWindow] = useState("today_afternoon");
  const [instructions, setInstructions] = useState("");
  const [requestPickup, { isLoading }] = useRequestPickupMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const windowLabel = PICKUP_WINDOWS.find((w) => w.id === selectedWindow)?.label || selectedWindow;
    const combinedNotes = instructions.trim()
      ? `Slot: ${windowLabel} | Note: ${instructions.trim()}`
      : `Slot: ${windowLabel}`;

    try {
      const res = await requestPickup({
        id: parcelId,
        notes: combinedNotes,
      }).unwrap();

      if (res.success) {
        toast.success(`Pickup requested for parcel ${trackingCode}`, {
          description: "Our operations hub has received your request and will dispatch a rider.",
        });
        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Could not request pickup. Please check status and try again.";
      toast.error("Pickup request failed", {
        description: errorMsg,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1.5 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Request Rider Pickup</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Parcel <span className="font-mono font-medium text-foreground">{trackingCode}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {pickupAddress && (
              <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pickup Location: </span>
                {pickupAddress}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Pickup Window</Label>
              <div className="grid gap-2">
                {PICKUP_WINDOWS.map((slot) => {
                  const isSelected = selectedWindow === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedWindow(slot.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-primary/5 font-medium text-foreground"
                          : "hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{slot.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pickup-instructions" className="text-xs font-medium">
                Instructions for Pickup Rider (Optional)
              </Label>
              <textarea
                id="pickup-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Front desk warehouse, ask for Kabir, gate #3"
                rows={2}
                maxLength={200}
                className="w-full rounded-md bg-field px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-field-hover focus:bg-surface"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5" />
                  Confirm Pickup Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
