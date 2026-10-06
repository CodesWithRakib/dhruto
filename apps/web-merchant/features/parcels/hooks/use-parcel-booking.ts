"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  parcelBookingSchema,
  type ApiValidationErrorItem,
  type ParcelBooking,
  type ParcelCreatedResponse,
} from "@dhruto/contracts";
import { toast } from "sonner";
import { useCreateParcelMutation } from "../api/parcels.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getApiErrorKey } from "@/lib/api-errors";

/**
 * Generates the `Idempotency-Key` for one booking attempt.
 *
 * `crypto.randomUUID` is available in every browser the portal supports; the
 * fallback keeps the key unique (never reused) if it is not.
 */
function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `parcel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable fingerprint of a booking payload.
 *
 * Fields are listed explicitly (rather than JSON-stringifying the RHF object) so
 * key order can never change the fingerprint and silently create a second parcel.
 */
function buildFingerprint(values: ParcelBooking): string {
  return [
    values.recipientName.trim(),
    values.recipientPhone.trim(),
    values.district.trim(),
    values.thana.trim(),
    values.deliveryAddress.trim(),
    (values.parcelDescription ?? "").trim(),
    Number(values.codAmount),
    Number(values.weight),
  ].join("|");
}

/** Pushes the API's per-field validation messages onto the matching form fields. */
function applyFieldErrors(
  error: unknown,
  setError: (field: keyof ParcelBooking, message: string) => void,
): boolean {
  if (typeof error !== "object" || error === null) return false;

  const errors = (error as { data?: { errors?: ApiValidationErrorItem[] } }).data?.errors;
  if (!errors?.length) return false;

  let applied = false;
  for (const item of errors) {
    const field = item.field as keyof ParcelBooking;
    if (field) {
      setError(field, item.message);
      applied = true;
    }
  }
  return applied;
}

export function useParcelBooking() {
  const [createdParcel, setCreatedParcel] = useState<ParcelCreatedResponse | null>(null);
  /** Raw server message, used only when no error key is recognised. */
  const [serverError, setServerError] = useState<string | null>(null);
  /** `ApiErrors` namespace key for a recognised failure (409, 429, 500, ...). */
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);

  const [createParcelMutation, { isLoading }] = useCreateParcelMutation();

  /**
   * Idempotency key bound to the payload that produced it.
   *
   * The API replays the original result when the same key *and* payload are
   * repeated, and returns 409 when a key is reused with different content. So
   * the key follows the payload: retrying an unchanged booking reuses it (no
   * duplicate parcel), while editing any field mints a fresh key (a genuinely
   * new booking).
   */
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const form = useForm<ParcelBooking>({
    resolver: zodResolver(parcelBookingSchema),
    defaultValues: {
      recipientName: "",
      recipientPhone: "",
      district: "",
      thana: "",
      deliveryAddress: "",
      parcelDescription: "",
      codAmount: 0,
      weight: 1,
    },
    mode: "onTouched",
  });

  const onSubmit = useCallback(
    async (values: ParcelBooking) => {
      setServerError(null);
      setServerErrorKey(null);

      const fingerprint = buildFingerprint(values);
      if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
        attemptRef.current = { fingerprint, key: createIdempotencyKey() };
      }

      try {
        const response = await createParcelMutation({
          booking: values,
          idempotencyKey: attemptRef.current.key,
        }).unwrap();

        if (response.data) {
          setCreatedParcel(response.data);
          // A new booking starts a new idempotency scope.
          attemptRef.current = null;
        }
      } catch (err) {
        const mappedToFields = applyFieldErrors(err, (field, message) =>
          form.setError(field, { type: "server", message }),
        );

        const key = getApiErrorKey(err);
        setServerErrorKey(key);
        setServerError(
          getApiErrorMessage(
            err,
            "Failed to create parcel booking. Please check your inputs and try again.",
          ),
        );

        // Field-level messages are already shown next to the inputs; only
        // surface a toast when the failure has no field to attach to.
        if (!mappedToFields) {
          toast.error("Booking submission failed");
        }
      }
    },
    [createParcelMutation, form],
  );

  const resetForm = useCallback(() => {
    form.reset();
    setCreatedParcel(null);
    setServerError(null);
    setServerErrorKey(null);
    attemptRef.current = null;
  }, [form]);

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
    createdParcel,
    serverError,
    serverErrorKey,
    resetForm,
  };
}
