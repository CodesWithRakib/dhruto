import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Domain events (versioned, secret-free)                               */
/* ------------------------------------------------------------------ */

/** Current event schema version. Bump only with a documented migration. */
export const DOMAIN_EVENT_VERSION = 1 as const;

/**
 * Versioned domain event names. The `.v1` suffix is part of the contract —
 * consumers switch on the full string and producers never change a shipped
 * payload shape without minting a new version.
 */
export enum DomainEventType {
  PARCEL_CREATED = "parcel.created.v1",
  PARCEL_ASSIGNED = "parcel.assigned.v1",
  PARCEL_OUT_FOR_DELIVERY = "parcel.out_for_delivery.v1",
  PARCEL_DELIVERED = "parcel.delivered.v1",
  PARCEL_FAILED = "parcel.failed.v1",
  PARCEL_RETURNED = "parcel.returned.v1",
  CASH_HAND_IN_SUBMITTED = "cash.hand_in_submitted.v1",
  CASH_VERIFIED = "cash.verified.v1",
  SETTLEMENT_CREATED = "settlement.created.v1",
  PAYOUT_REQUESTED = "payout.requested.v1",
  PAYOUT_APPROVED = "payout.approved.v1",
  PAYOUT_COMPLETED = "payout.completed.v1",
  PAYOUT_FAILED = "payout.failed.v1",
  DISCREPANCY_OPENED = "discrepancy.opened.v1",
  DISCREPANCY_RESOLVED = "discrepancy.resolved.v1",
}

export const domainEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.nativeEnum(DomainEventType),
  version: z.literal(DOMAIN_EVENT_VERSION),
  occurredAt: z.string(),
  aggregateType: z.string().min(1).max(64),
  aggregateId: z.string().uuid(),
  requestId: z.string().min(1).max(128),
  actorId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

export type DomainEvent = z.infer<typeof domainEventSchema>;

export enum OutboxStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export interface OutboxItem {
  id: string;
  eventId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  status: OutboxStatus;
  attemptCount: number;
  availableAt: string;
  publishedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Notification preferences                                             */
/* ------------------------------------------------------------------ */

export enum NotificationCategory {
  PARCEL_UPDATES = "PARCEL_UPDATES",
  FINANCIAL_UPDATES = "FINANCIAL_UPDATES",
  SECURITY_ALERTS = "SECURITY_ALERTS",
}

export enum PreferenceChannel {
  IN_APP = "IN_APP",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

/** Categories that cannot be disabled (financial + security stay on). */
export const LOCKED_CATEGORIES: readonly NotificationCategory[] = [
  NotificationCategory.FINANCIAL_UPDATES,
  NotificationCategory.SECURITY_ALERTS,
];

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z.nativeEnum(NotificationCategory),
        channel: z.nativeEnum(PreferenceChannel),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
  locale: z.enum(["en", "bn"]).optional(),
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;

export interface NotificationPreferenceItem {
  category: NotificationCategory;
  channel: PreferenceChannel;
  enabled: boolean;
  locked: boolean;
  updatedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Templates (typed variables, bilingual output)                        */
/* ------------------------------------------------------------------ */

export type SupportedLocale = "en" | "bn";

export interface TemplateText {
  title: string;
  body: string;
}

export interface RenderedTemplate {
  en: TemplateText;
  bn: TemplateText;
}

/** Strict per-template variables — never Record<string, any>. */
export interface ParcelCreatedVars {
  trackingCode: string;
  recipientName: string;
}
export interface ParcelOutForDeliveryVars {
  trackingCode: string;
}
export interface ParcelDeliveredVars {
  trackingCode: string;
  codCollected: number;
}
export interface ParcelFailedVars {
  trackingCode: string;
  reason: string;
}
export interface SettlementCreatedVars {
  trackingCode: string;
  netAmount: number;
  settlementCode: string;
}
export interface PayoutVars {
  payoutCode: string;
  amount: number;
  method: string;
}
export interface DiscrepancyVars {
  trackingCode: string;
  differenceMinor: number;
}
export interface HandInSubmittedVars {
  handinCode: string;
  itemCount: number;
  totalMinor: number;
}

/* ------------------------------------------------------------------ */
/* Dead-letter + integration health                                    */
/* ------------------------------------------------------------------ */

export enum IntegrationFailureKind {
  WEBHOOK = "WEBHOOK",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

export enum IntegrationFailureStatus {
  OPEN = "OPEN",
  REPLAYED = "REPLAYED",
  RESOLVED = "RESOLVED",
}

export interface IntegrationFailureItem {
  id: string;
  jobId: string | null;
  eventId: string | null;
  queue: string;
  kind: IntegrationFailureKind;
  referenceId: string | null;
  reason: string;
  attempts: number;
  status: IntegrationFailureStatus;
  lastAttemptAt: string | null;
  createdAt: string;
}

export interface QueueHealthItem {
  name: string;
  reachable: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface IntegrationOverview {
  queues: QueueHealthItem[];
  providers: {
    sms: { mode: "log" | "http"; configured: boolean };
    email: { mode: "log" | "http"; configured: boolean };
  };
  deadLetterCount: number;
  webhookFailureRate24h: number;
  notificationFailureRate24h: number;
  outbox: {
    pending: number;
    failed: number;
    publishedLastHour: number;
    oldestPendingAgeMs: number | null;
  };
  checkedAt: string;
}

/* ------------------------------------------------------------------ */
/* Provider error classification                                        */
/* ------------------------------------------------------------------ */

export enum ProviderErrorKind {
  TRANSIENT = "TRANSIENT",
  PERMANENT = "PERMANENT",
}

export const PROVIDER_ERROR_CODES = {
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  WEBHOOK_4XX: "WEBHOOK_4XX",
  WEBHOOK_5XX: "WEBHOOK_5XX",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_PROVIDER_ERROR: "UNKNOWN_PROVIDER_ERROR",
} as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];
