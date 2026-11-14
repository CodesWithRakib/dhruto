"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Skeleton,
} from "@dhruto/ui";
import {
  Building2,
  Phone,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Webhook,
  Wallet,
  Bell,
  RefreshCw,
  Store,
} from "lucide-react";
import {
  useGetMerchantProfileQuery,
  useUpdateMerchantProfileMutation,
} from "../api/merchants.api";
import { CopyButton } from "@/components/data-display/copy-button";
import { Link } from "@/lib/navigation";
import { MERCHANT_ROUTES } from "@/config/routes";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";

export function MerchantSettingsView() {
  const authUser = useAppSelector((s) => s.auth.user);

  const { data: profileResponse, isLoading, refetch, isFetching } = useGetMerchantProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateMerchantProfileMutation();

  const merchant = profileResponse?.data;

  const [businessName, setBusinessName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.businessName || "");
      setContactPhone(merchant.contactPhone || "");
      setPickupAddress(merchant.pickupAddress || "");
      setIsDirty(false);
    }
  }, [merchant]);

  const handleFieldChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => {
    setter(value);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !contactPhone.trim() || !pickupAddress.trim()) {
      toast.error("Please fill in all required profile fields.");
      return;
    }

    try {
      await updateProfile({
        businessName: businessName.trim(),
        contactPhone: contactPhone.trim(),
        pickupAddress: pickupAddress.trim(),
      }).unwrap();

      toast.success("Merchant profile updated successfully.");
      setIsDirty(false);
    } catch {
      toast.error("Failed to update merchant profile. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview Banner */}
      <div className="overflow-hidden rounded-3xl bg-surface-elevated p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {merchant?.businessName || authUser?.name || "Merchant Business"}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  {merchant?.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {authUser?.email} • Registered Merchant Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Edit Form (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-surface-elevated p-6 sm:p-8 space-y-6">
            <div className="pb-2">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Business & Pickup Details
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                This information is used for pickup coordination, shipping labels, and merchant invoices.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-xs font-semibold">
                  Business / Store Name <span className="text-danger">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => handleFieldChange(setBusinessName, e.target.value)}
                    placeholder="e.g. Dhaka Electronics Ltd."
                    className="rounded-2xl border-0 bg-surface-muted/60 pl-9 text-sm"
                    required
                  />
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-xs font-semibold">
                  Contact Phone Number <span className="text-danger">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => handleFieldChange(setContactPhone, e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="rounded-2xl border-0 bg-surface-muted/60 pl-9 text-sm"
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Riders and hub operators call this number during dispatch or pickup queries.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupAddress" className="text-xs font-semibold">
                  Default Pickup Address <span className="text-danger">*</span>
                </Label>
                <div className="relative">
                  <textarea
                    id="pickupAddress"
                    rows={3}
                    value={pickupAddress}
                    onChange={(e) => handleFieldChange(setPickupAddress, e.target.value)}
                    placeholder="e.g. House 42, Road 7, Sector 3, Uttara, Dhaka 1230"
                    className="w-full rounded-2xl border-0 bg-surface-muted/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Primary hub assigned to collect booked parcels from your facility.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isUpdating || !isDirty}
                  className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
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
        </div>

        {/* Sidebar Cards (1 col on lg) */}
        <div className="space-y-6">
          {/* Identity & Technical Info */}
          <div className="rounded-3xl bg-surface-elevated p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Account Details
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-muted-foreground text-[11px]">Merchant ID</p>
                <div className="mt-1 flex items-center justify-between rounded-xl bg-surface-muted/60 px-3 py-2 font-mono text-[11px]">
                  <span className="truncate max-w-[200px]">{merchant?.id || "N/A"}</span>
                  {merchant?.id ? (
                    <CopyButton
                      value={merchant.id}
                      label="Copy Merchant ID"
                      copiedLabel="Copied"
                      errorLabel="Error"
                      size="sm"
                    />
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-[11px]">User Account</p>
                <p className="font-semibold mt-0.5 text-foreground">{authUser?.name || "Merchant"}</p>
                <p className="text-[11px] text-muted-foreground">{authUser?.email}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-[11px]">Member Since</p>
                <p className="font-semibold mt-0.5 text-foreground">
                  {merchant?.createdAt
                    ? new Date(merchant.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Active"}
                </p>
              </div>
            </div>
          </div>

          {/* Connected Shortcuts */}
          <div className="rounded-3xl bg-surface-elevated p-6 space-y-3">
            <h3 className="text-base font-bold text-foreground">Quick Links</h3>

            <div className="space-y-2">
              <Link
                href={MERCHANT_ROUTES.webhooks}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Webhook className="h-4 w-4 text-primary" />
                  <span>Webhooks & API Keys</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={MERCHANT_ROUTES.finance}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>Wallet & Payouts</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/merchant/notifications"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>Notification Center</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
