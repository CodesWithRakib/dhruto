import { z } from "zod";

/**
 * Canonical Bangladesh mobile number pattern.
 * Format: 01XXXXXXXXX (11 digits, operator prefix 13-19).
 */
export const BANGLADESH_PHONE_REGEX = /^01[3-9]\d{8}$/;

/**
 * Normalizes a Bangladesh mobile number to the canonical `01XXXXXXXXX` form.
 *
 * Accepted inputs: `01XXXXXXXXX`, `+8801XXXXXXXXX`, `8801XXXXXXXXX`, `1XXXXXXXXX`,
 * with optional spaces, dashes or parentheses.
 */
export function normalizeBangladeshPhone(input: string): string {
  const digits = String(input ?? "").replace(/\D/g, "");

  let local = digits;
  if (local.startsWith("880")) {
    local = local.slice(3);
  } else if (local.startsWith("88")) {
    local = local.slice(2);
  }

  if (!local.startsWith("0") && local.length === 10) {
    local = `0${local}`;
  }

  return local;
}

/**
 * Dhruto parcel lifecycle statuses.
 *
 * NOTE (spec reconciliation): the Phase 1 brief names the initial state
 * `ORDER_CREATED`; the implemented Phase 0 lifecycle (docs/08-STATE-MACHINE.md)
 * uses `CREATED` for the same state. `CREATED` is retained as the single
 * canonical initial status so the state machine, seeds, finance and hub flows
 * stay internally consistent. See docs/08-STATE-MACHINE.md §1.
 */
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

/** The status a parcel is created in. */
export const INITIAL_PARCEL_STATUS = ParcelStatus.CREATED;

/** Canonical tracking code format: DHR-YYYYMMDD-XXXXXX. */
export const TRACKING_CODE_REGEX = /^DHR-\d{8}-[0-9A-Z]{6}$/;

export const parcelBookingSchema = z.object({
  recipientName: z
    .string({ required_error: "Recipient name is required" })
    .trim()
    .min(2, "Recipient name must be at least 2 characters")
    .max(100, "Recipient name cannot exceed 100 characters"),
  recipientPhone: z
    .string({ required_error: "Recipient phone is required" })
    .transform((value) => normalizeBangladeshPhone(value))
    .refine(
      (value) => BANGLADESH_PHONE_REGEX.test(value),
      "Invalid Bangladesh mobile number (format: 01XXXXXXXXX, 11 digits)",
    ),
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
  parcelDescription: z
    .string()
    .trim()
    .max(500, "Parcel description cannot exceed 500 characters")
    .optional(),
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

/** Summary projection of a parcel. Never exposes internal audit columns. */
export const parcelSummarySchema = z.object({
  id: z.string().uuid(),
  trackingCode: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  district: z.string(),
  thana: z.string(),
  deliveryAddress: z.string(),
  parcelDescription: z.string().nullable(),
  codAmount: z.number(),
  weight: z.number(),
  deliveryFee: z.number(),
  status: z.nativeEnum(ParcelStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ParcelSummary = z.infer<typeof parcelSummarySchema>;

/** Response returned by parcel creation. */
export const parcelCreatedResponseSchema = parcelSummarySchema;
export type ParcelCreatedResponse = z.infer<typeof parcelCreatedResponseSchema>;

/** A row in the paginated merchant parcel list. */
export const parcelListItemSchema = parcelSummarySchema;
export type ParcelListItem = z.infer<typeof parcelListItemSchema>;

export enum DeliveryZone {
  INSIDE_DHAKA = "INSIDE_DHAKA",
  DHAKA_SUBURBS = "DHAKA_SUBURBS",
  OUTSIDE_DHAKA = "OUTSIDE_DHAKA",
}

export const pricingCalculationSchema = z.object({
  district: z.string().trim().min(1, "District is required").max(50),
  thana: z.string().trim().max(50).optional(),
  weight: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .max(50, "Weight exceeds maximum allowable limit of 50 kg"),
  codAmount: z.coerce.number().min(0).max(500000).default(0),
});

export type PricingCalculation = z.infer<typeof pricingCalculationSchema>;

/**
 * Pricing breakdown. All monetary values are BDT amounts with 2 decimal places.
 * `additionalCharge` and `discount` are explicit extension points for later
 * phases (remote area fee, promotions); they are 0 in Phase 1.
 */
export const pricingResultSchema = z.object({
  zone: z.nativeEnum(DeliveryZone),
  baseFee: z.number(),
  weightFee: z.number(),
  additionalCharge: z.number(),
  discount: z.number(),
  codFee: z.number(),
  totalFee: z.number(),
  estimatedDays: z.string(),
});

export type PricingResult = z.infer<typeof pricingResultSchema>;

/* ------------------------------------------------------------------ */
/* Merchant parcel list: query + pagination                            */
/* ------------------------------------------------------------------ */

export const PARCEL_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "codAmount",
  "deliveryFee",
] as const;

export const parcelListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(PARCEL_LIST_SORT_FIELDS).default("createdAt"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
  status: z.nativeEnum(ParcelStatus).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(50).optional(),
  thana: z.string().trim().min(1).max(50).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  /**
   * Opaque keyset cursor (`base64url(createdAt|id)`) for deep pagination.
   * When present, offset is ignored and ordering is forced to
   * createdAt+id in the requested direction, so concurrent inserts can
   * neither duplicate nor skip rows.
   */
  cursor: z.string().trim().min(1).max(256).optional(),
});

export type ParcelListQuery = z.infer<typeof parcelListQuerySchema>;

/* ------------------------------------------------------------------ */
/* History / timeline                                                  */
/* ------------------------------------------------------------------ */

export const parcelHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  fromStatus: z.nativeEnum(ParcelStatus).nullable(),
  toStatus: z.nativeEnum(ParcelStatus),
  eventType: z.string(),
  description: z.string().nullable(),
  actorRole: z.string(),
  createdAt: z.string(),
});

export type ParcelHistoryEntry = z.infer<typeof parcelHistoryEntrySchema>;

export const timelineEventSchema = z.object({
  status: z.nativeEnum(ParcelStatus),
  labelEn: z.string(),
  labelBn: z.string(),
  timestamp: z.string(),
  note: z.string().optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

/**
 * Public tracking payload. Deliberately excludes merchant identity, financial
 * values, internal IDs and audit metadata (docs/10-SECURITY.md §6).
 */
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

/**
 * Address/risk intelligence attached to a parcel (Phase 6). Expressed as an
 * explicit contract so the raw `normalized_address` column never leaks while
 * still allowing Phase 6 to enrich the same fields.
 */
export const parcelAddressIntelligenceSchema = z.object({
  district: z.string(),
  thana: z.string(),
  zone: z.string().nullable(),
  confidenceScore: z.number().nullable(),
  confidenceTier: z.string().nullable(),
  riskScore: z.number().nullable(),
  riskTier: z.string().nullable(),
  rtoProbability: z.number().nullable(),
});

export type ParcelAddressIntelligence = z.infer<typeof parcelAddressIntelligenceSchema>;

export const parcelDetailsResponseSchema = parcelSummarySchema.extend({
  merchantId: z.string().uuid(),
  merchantName: z.string(),
  pickupAddress: z.string(),
  currentRiderName: z.string().nullable(),
  currentHubName: z.string().nullable(),
  addressIntelligence: parcelAddressIntelligenceSchema,
  history: z.array(parcelHistoryEntrySchema),
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
