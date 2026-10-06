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
  PAYOUT_REQUESTED = "payout.requested",
  PAYOUT_COMPLETED = "payout.completed",
  ALL = "*",
}

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

export interface WebhookSubscriptionItem {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  secret: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
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
