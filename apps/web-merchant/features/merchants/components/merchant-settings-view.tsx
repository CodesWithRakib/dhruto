"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@dhruto/ui";
import {
  useGetMerchantProfileQuery,
  useUpdateMerchantProfileMutation,
} from "../api/merchants.api";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { MerchantProfileCard } from "./merchant-profile-card";
import { MerchantDetailsForm } from "./merchant-details-form";
import { MerchantAccountSidebar } from "./merchant-account-sidebar";

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
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MerchantProfileCard
        businessName={merchant?.businessName || authUser?.name || "Merchant Business"}
        email={authUser?.email}
        status={merchant?.status || "ACTIVE"}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MerchantDetailsForm
            businessName={businessName}
            onBusinessNameChange={(val) => {
              setBusinessName(val);
              setIsDirty(true);
            }}
            contactPhone={contactPhone}
            onContactPhoneChange={(val) => {
              setContactPhone(val);
              setIsDirty(true);
            }}
            pickupAddress={pickupAddress}
            onPickupAddressChange={(val) => {
              setPickupAddress(val);
              setIsDirty(true);
            }}
            onSubmit={handleSubmit}
            isUpdating={isUpdating}
            isDirty={isDirty}
          />
        </div>

        <div className="lg:col-span-1">
          <MerchantAccountSidebar
            merchantId={merchant?.id}
            userName={authUser?.name}
            userEmail={authUser?.email}
            createdAt={merchant?.createdAt}
          />
        </div>
      </div>
    </div>
  );
}
