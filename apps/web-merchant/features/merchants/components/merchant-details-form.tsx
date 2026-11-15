"use client";

import React from "react";
import { Building2, Phone, RefreshCw, Save } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";

interface MerchantDetailsFormProps {
  businessName: string;
  onBusinessNameChange: (val: string) => void;
  contactPhone: string;
  onContactPhoneChange: (val: string) => void;
  pickupAddress: string;
  onPickupAddressChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isUpdating: boolean;
  isDirty: boolean;
}

export function MerchantDetailsForm({
  businessName,
  onBusinessNameChange,
  contactPhone,
  onContactPhoneChange,
  pickupAddress,
  onPickupAddressChange,
  onSubmit,
  isUpdating,
  isDirty,
}: MerchantDetailsFormProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 sm:p-8 space-y-6 shadow-sm backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="border-b border-border/60 pb-3">
        <h3 className="text-body-md font-bold flex items-center gap-2 text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          <span>Business & Pickup Details</span>
        </h3>
        <p className="text-caption text-muted-foreground mt-1">
          This information is used for pickup coordination, shipping labels, and merchant invoices.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            Business / Store Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              placeholder="e.g. Dhaka Electronics Ltd."
              className="rounded-2xl border-border/80 bg-surface-muted/50 pl-10 text-sm focus:bg-surface-elevated transition-colors"
              required
            />
            <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            Contact Phone Number <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder="e.g. 01712345678"
              className="rounded-2xl border-border/80 bg-surface-muted/50 pl-10 text-sm focus:bg-surface-elevated transition-colors font-mono"
              required
            />
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-caption text-muted-foreground">
            Riders and hub operators call this number during dispatch or pickup queries.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pickupAddress" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            Default Pickup Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <textarea
              id="pickupAddress"
              rows={3}
              value={pickupAddress}
              onChange={(e) => onPickupAddressChange(e.target.value)}
              placeholder="e.g. House 42, Road 7, Sector 3, Uttara, Dhaka 1230"
              className="w-full rounded-2xl border border-border/80 bg-surface-muted/50 p-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-surface-elevated transition-colors resize-none"
              required
            />
          </div>
          <p className="text-caption text-muted-foreground">
            Primary hub assigned to collect booked parcels from your facility.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isUpdating || !isDirty}
            className="gap-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
