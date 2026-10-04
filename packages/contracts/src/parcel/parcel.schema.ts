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
  normalizedAddress: z.record(z.any()).optional(),
  createdAt: z.string(),
});

export type ParcelCreatedResponse = z.infer<typeof parcelCreatedResponseSchema>;

export enum DeliveryZone {
  INSIDE_DHAKA = "INSIDE_DHAKA",
  DHAKA_SUBURBS = "DHAKA_SUBURBS",
  OUTSIDE_DHAKA = "OUTSIDE_DHAKA",
}

export const pricingCalculationSchema = z.object({
  district: z.string().trim().min(1, "District is required"),
  thana: z.string().trim().optional(),
  weight: z.coerce.number().positive("Weight must be greater than 0"),
  codAmount: z.coerce.number().min(0).default(0),
});

export type PricingCalculation = z.infer<typeof pricingCalculationSchema>;

export const pricingResultSchema = z.object({
  zone: z.nativeEnum(DeliveryZone),
  baseFee: z.number(),
  weightFee: z.number(),
  codFee: z.number(),
  totalFee: z.number(),
  estimatedDays: z.string(),
});

export type PricingResult = z.infer<typeof pricingResultSchema>;

export const timelineEventSchema = z.object({
  status: z.nativeEnum(ParcelStatus),
  labelEn: z.string(),
  labelBn: z.string(),
  timestamp: z.string(),
  note: z.string().optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const publicTrackingResponseSchema = z.object({
  trackingCode: z.string(),
  status: z.nativeEnum(ParcelStatus),
  recipientDistrict: z.string(),
  recipientThana: z.string(),
  recipientPhoneMasked: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentHubName: z.string().nullable(),
  timeline: z.array(timelineEventSchema),
});

export type PublicTrackingResponse = z.infer<typeof publicTrackingResponseSchema>;

export const statusHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  fromStatus: z.string().nullable(),
  toStatus: z.nativeEnum(ParcelStatus),
  changedByRole: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export type StatusHistoryEntry = z.infer<typeof statusHistoryEntrySchema>;

export const parcelDetailsResponseSchema = parcelCreatedResponseSchema.extend({
  merchantId: z.string().uuid(),
  merchantName: z.string().optional(),
  pickupAddress: z.string().optional(),
  currentRiderName: z.string().nullable().optional(),
  currentRiderPhone: z.string().nullable().optional(),
  currentHubName: z.string().nullable().optional(),
  statusHistory: z.array(statusHistoryEntrySchema).default([]),
});

export type ParcelDetailsResponse = z.infer<typeof parcelDetailsResponseSchema>;

export const shippingLabelResponseSchema = z.object({
  trackingCode: z.string(),
  barcodeSvg: z.string(),
  merchantName: z.string(),
  merchantPhone: z.string(),
  pickupAddress: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  deliveryAddress: z.string(),
  district: z.string(),
  thana: z.string(),
  weightKg: z.number(),
  codAmount: z.number(),
  deliveryFee: z.number(),
  zone: z.string(),
  createdDate: z.string(),
  routingHub: z.string(),
});

export type ShippingLabelResponse = z.infer<typeof shippingLabelResponseSchema>;
