"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@dhruto/ui";
import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { useCancelParcelMutation } from "../api/parcels.api";
import { toast } from "sonner";

export interface ParcelCancelDialogProps {
  parcelId: string;
  trackingCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ParcelCancelDialog({
  parcelId,
  trackingCode,
  isOpen,
  onClose,
  onSuccess,
}: ParcelCancelDialogProps) {
  const [cancelParcel, { isLoading }] = useCancelParcelMutation();

  const handleConfirm = async () => {
    try {
      await cancelParcel(parcelId).unwrap();
      toast.success(`Shipment ${trackingCode} cancelled successfully.`);
      onClose();
      onSuccess?.();
    } catch {
      toast.error("Failed to cancel shipment. It may have already transitioned past pickup.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-3">
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Cancel Shipment Booking
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to cancel booking{" "}
              <span className="font-mono font-bold text-foreground">{trackingCode}</span>?
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-xl bg-danger-soft/40 p-4 text-xs space-y-1.5 text-danger-soft-foreground">
          <p className="font-bold flex items-center gap-1.5 text-danger">
            <XCircle className="h-4 w-4" />
            Cancellation Policy Notice
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Cancellations are only permitted prior to physical pickup by the courier fleet. Once cancelled, this tracking code will be permanently retired.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Keep Shipment
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-1.5 rounded-xl bg-danger text-white hover:bg-danger/90"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <span>Confirm Cancellation</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
