import { z } from "zod";

export enum WebhookEvent {
  PING = "webhook.ping",
  PARCEL_CREATED = "parcel.created",
  PARCEL_ASSIGNED = "parcel.assigned",
  PARCEL_OUT_FOR_DELIVERY = "parcel.out_for_delivery",
  PARCEL_DELIVERED = "parcel.delivered",
  PARCEL_FAILED = "parcel.failed",
  PARCEL_RETURNED = "parcel.returned",
  CASH_VERIFIED = "cash.verified",
  SETTLEMENT_CREATED = "settlement.created",
  PAYOUT_REQUESTED = "payout.requested",
  PAYOUT_APPROVED = "payout.approved",
  PAYOUT_COMPLETED = "payout.completed",
  PAYOUT_FAILED = "payout.failed",
  ALL = "*",
}

/** Public webhook envelope version, independent of the REST API version. */
export const WEBHOOK_PAYLOAD_VERSION = 1 as const;

export enum WebhookDeliveryStatus {
  PENDING = "PENDING",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  DEAD_LETTER = "DEAD_LETTER",
}

export const createWebhookSubscriptionSchema = z.object({
  url: z.string().url("Must be a valid HTTP or HTTPS webhook URL"),
  events: z.array(z.string()).min(1, "Select at least one webhook event"),
  secret: z.string().min(16, "Secret key must be at least 16 characters").optional(),
  description: z.string().max(255).optional(),
});

export type CreateWebhookSubscriptionDto = z.infer<typeof createWebhookSubscriptionSchema>;

export const updateWebhookSubscriptionSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  description: z.string().max(255).optional(),
});

export type UpdateWebhookSubscriptionDto = z.infer<typeof updateWebhookSubscriptionSchema>;

/**
 * Full secret is returned ONLY on create/rotate responses. List/detail
 * responses carry the masked preview instead.
 */
export interface WebhookSubscriptionItem {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  secret: string;
  secretPreview: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSecretRotationResult {
  id: string;
  secret: string;
  secretPreview: string;
  message: string;
}

export interface WebhookDeliveryItem {
  id: string;
  subscriptionId: string;
  merchantId: string;
  event: string;
  payload: Record<string, unknown>;
  signature: string;
  statusCode?: number | null;
  responseBody?: string | null;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextRetryAt?: string | null;
  lastAttemptAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}
