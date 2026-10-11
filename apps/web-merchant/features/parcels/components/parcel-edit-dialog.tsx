"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from "@dhruto/ui";
import { Edit3, Phone, RefreshCw, Save, User } from "lucide-react";
import { useUpdateParcelMutation } from "../api/parcels.api";
import { toast } from "sonner";

export interface ParcelEditDialogProps {
  parcelId: string;
  trackingCode: string;
  initialRecipientName: string;
  initialRecipientPhone: string;
  initialDeliveryAddress: string;
  initialNotes?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ParcelEditDialog({
  parcelId,
  trackingCode,
  initialRecipientName,
  initialRecipientPhone,
  initialDeliveryAddress,
  initialNotes,
  isOpen,
  onClose,
  onSuccess,
}: ParcelEditDialogProps) {
  const [recipientName, setRecipientName] = useState(initialRecipientName);
  const [recipientPhone, setRecipientPhone] = useState(initialRecipientPhone);
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress);
  const [notes, setNotes] = useState(initialNotes || "");

  const [updateParcel, { isLoading }] = useUpdateParcelMutation();

  useEffect(() => {
    setRecipientName(initialRecipientName);
    setRecipientPhone(initialRecipientPhone);
    setDeliveryAddress(initialDeliveryAddress);
    setNotes(initialNotes || "");
  }, [initialRecipientName, initialRecipientPhone, initialDeliveryAddress, initialNotes, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim() || !recipientPhone.trim() || !deliveryAddress.trim()) {
      toast.error("Please fill in recipient name, phone, and delivery address.");
      return;
    }

    try {
      await updateParcel({
        id: parcelId,
        data: {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim(),
        },
      }).unwrap();

      toast.success(`Shipment ${trackingCode} updated successfully.`);
      onClose();
      onSuccess?.();
    } catch {
      toast.error("Failed to update shipment. Editing is only permitted prior to courier pickup.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Edit Shipment Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update recipient info for <span className="font-mono font-bold text-foreground">{trackingCode}</span> prior to pickup.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-recipient-name" className="text-xs font-semibold">
              Recipient Name <span className="text-danger">*</span>
            </Label>
            <div className="relative">
              <Input
                id="edit-recipient-name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Rahim Uddin"
                disabled={isLoading}
                required
                className="h-10 rounded-xl pl-9 text-xs"
              />
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-recipient-phone" className="text-xs font-semibold">
              Recipient Phone <span className="text-danger">*</span>
            </Label>
            <div className="relative">
              <Input
                id="edit-recipient-phone"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                disabled={isLoading}
                required
                className="h-10 rounded-xl pl-9 text-xs"
              />
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-delivery-address" className="text-xs font-semibold">
              Delivery Address <span className="text-danger">*</span>
            </Label>
            <div className="relative">
              <textarea
                id="edit-delivery-address"
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Street address, building, apartment"
                disabled={isLoading}
                required
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="text-xs font-semibold">
              Delivery Notes / Instructions
            </Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call before delivery, handle with care"
              disabled={isLoading}
              className="h-10 rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
