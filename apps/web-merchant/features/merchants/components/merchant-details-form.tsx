"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Building2, Phone, RefreshCw, Save } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";

interface MerchantDetailsFormProps {
  businessName: string;
  onBusinessNameChange: (val: string) => void;
  contactPhone: string;
  onContactPhoneChange: (val: string) => void;
  pickupDistrict: string;
  onPickupDistrictChange: (val: string) => void;
  pickupThana: string;
  onPickupThanaChange: (val: string) => void;
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
  pickupDistrict,
  onPickupDistrictChange,
  pickupThana,
  onPickupThanaChange,
  pickupAddress,
  onPickupAddressChange,
  onSubmit,
  isUpdating,
  isDirty,
}: MerchantDetailsFormProps) {
  const t = useTranslations("Settings");

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-6 sm:p-8 space-y-6 backdrop-blur-md">

      <div className="pb-3">
        <h3 className="text-body-md font-bold flex items-center gap-2 text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          <span>{t("businessDetails")}</span>
        </h3>
        <p className="text-caption text-muted-foreground mt-1">
          {t("businessDetailsDesc")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("businessName")} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              placeholder={t("businessNamePlaceholder")}
              className="rounded-2xl bg-surface-muted/50 pl-10 text-sm focus:bg-surface-elevated transition-colors"
              required
            />
            <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("contactPhone")} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder={t("contactPhonePlaceholder")}
              className="rounded-2xl bg-surface-muted/50 pl-10 text-sm focus:bg-surface-elevated transition-colors font-mono"
              required
            />
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-caption text-muted-foreground">
            {t("contactPhoneDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pickupDistrict" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("pickupDistrict")} <span className="text-destructive">*</span>
            </Label>
            <DistrictSelect
              id="pickupDistrict"
              name="pickupDistrict"
              value={pickupDistrict}
              onChange={onPickupDistrictChange}
              aria-label={t("pickupDistrict")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickupThana" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("pickupThana")}
            </Label>
            <ThanaSelect
              id="pickupThana"
              name="pickupThana"
              districtName={pickupDistrict}
              value={pickupThana}
              onChange={onPickupThanaChange}
              aria-label={t("pickupThana")}
            />
          </div>
          <p className="text-caption text-muted-foreground sm:col-span-2">{t("pickupDistrictDesc")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pickupAddress" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("pickupAddress")} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <textarea
              id="pickupAddress"
              rows={3}
              value={pickupAddress}
              onChange={(e) => onPickupAddressChange(e.target.value)}
              placeholder={t("pickupAddressPlaceholder")}
              className="w-full rounded-2xl bg-field p-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-surface-elevated transition-colors resize-none hover:bg-field-hover"
              required
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {t("pickupAddressDesc")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isUpdating || !isDirty}
            className="gap-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{t("saveChanges")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
