import { z } from "zod";

export const BANGLADESH_PHONE_REGEX = /^01[3-9]\d{8}$/;

export enum ParcelStatus {
  CREATED = "CREATED",
  PICKUP_REQUESTED = "PICKUP_REQUESTED",
  PICKUP_ASSIGNED = "PICKUP_ASSIGNED",
  PICKED_UP = "PICKED_UP",
  ORIGIN_HUB_RECEIVED = "ORIGIN_HUB_RECEIVED",
  BAGGED = "BAGGED",
  IN_TRANSIT = "IN_TRANSIT",
  DESTINATION_HUB_RECEIVED = "DESTINATION_HUB_RECEIVED",
  ASSIGNED_TO_RIDER = "ASSIGNED_TO_RIDER",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERY_ATTEMPTED = "DELIVERY_ATTEMPTED",
  RESCHEDULED = "RESCHEDULED",
  DELIVERED = "DELIVERED",
  CASH_PENDING = "CASH_PENDING",
  CASH_VERIFIED = "CASH_VERIFIED",
  RTO_INITIATED = "RTO_INITIATED",
  RETURN_IN_TRANSIT = "RETURN_IN_TRANSIT",
  RETURNED_TO_MERCHANT = "RETURNED_TO_MERCHANT",
  CANCELLED = "CANCELLED",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
}

export const parcelBookingSchema = z.object({
  recipientName: z
    .string({ required_error: "Recipient name is required" })
    .trim()
    .min(2, "Recipient name must be at least 2 characters")
    .max(100, "Recipient name cannot exceed 100 characters"),
  recipientPhone: z
    .string({ required_error: "Recipient phone is required" })
    .trim()
    .regex(BANGLADESH_PHONE_REGEX, "Invalid Bangladesh mobile number (format: 01XXXXXXXXX, 11 digits)"),
  district: z
    .string({ required_error: "District is required" })
    .trim()
    .min(1, "District is required")
    .max(50, "District cannot exceed 50 characters"),
  thana: z
    .string({ required_error: "Thana/Upazila is required" })
    .trim()
    .min(1, "Thana/Upazila is required")
    .max(50, "Thana cannot exceed 50 characters"),
  deliveryAddress: z
    .string({ required_error: "Delivery address is required" })
    .trim()
    .min(5, "Delivery address must be at least 5 characters")
    .max(300, "Delivery address cannot exceed 300 characters"),
  codAmount: z.coerce
    .number({ invalid_type_error: "COD amount must be a number" })
    .min(0, "COD amount cannot be negative")
    .max(500000, "COD amount exceeds maximum limit of 500,000 BDT"),
  weight: z.coerce
    .number({ invalid_type_error: "Weight must be a number" })
    .positive("Weight must be positive (greater than 0 kg)")
    .max(50, "Weight exceeds maximum allowable limit of 50 kg"),
});

export type ParcelBooking = z.infer<typeof parcelBookingSchema>;

export const parcelCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  trackingCode: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  district: z.string(),
  thana: z.string(),
  deliveryAddress: z.string(),
  codAmount: z.number(),
  weight: z.number(),
  deliveryFee: z.number(),
  status: z.nativeEnum(ParcelStatus),
  createdAt: z.string(),
});

export type ParcelCreatedResponse = z.infer<typeof parcelCreatedResponseSchema>;
