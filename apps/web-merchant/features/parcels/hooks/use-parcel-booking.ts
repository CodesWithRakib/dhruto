"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parcelBookingSchema, type ParcelBooking } from "@dhruto/contracts";
import { useCreateParcelMutation } from "../api/parcels.api";
import { toast } from "sonner";
import { type ParcelCreatedResponse } from "@dhruto/contracts";

export function useParcelBooking() {
  const [createdParcel, setCreatedParcel] = useState<ParcelCreatedResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [createParcelMutation, { isLoading }] = useCreateParcelMutation();

  const form = useForm<ParcelBooking>({
    resolver: zodResolver(parcelBookingSchema),
    defaultValues: {
      recipientName: "",
      recipientPhone: "",
      district: "Dhaka",
      thana: "Dhanmondi",
      deliveryAddress: "",
      codAmount: 0,
      weight: 1,
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: ParcelBooking) => {
    setServerError(null);
    try {
      const response = await createParcelMutation(values).unwrap();
      if (response.success && response.data) {
        setCreatedParcel(response.data);
        toast.success("Parcel booked successfully!", {
          description: `Tracking code: ${response.data.trackingCode}`,
        });
      }
    } catch (err: unknown) {
      const errorObj = err as {
        data?: { message?: string; errors?: Array<{ message: string; field: string }> };
        error?: string;
      };

      const message =
        errorObj.data?.message ||
        errorObj.data?.errors?.[0]?.message ||
        errorObj.error ||
        "Failed to create parcel booking. Please check your inputs and try again.";

      setServerError(message);
      toast.error("Booking submission failed", {
        description: message,
      });
    }
  };

  const resetForm = () => {
    form.reset();
    setCreatedParcel(null);
    setServerError(null);
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
    createdParcel,
    serverError,
    resetForm,
  };
}
