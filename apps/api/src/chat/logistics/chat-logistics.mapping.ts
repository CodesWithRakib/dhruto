import {
  CHAT_LOGISTICS_EVENT_KEYS,
  DeliveryFailureReason,
  DomainEventType,
  chatSystemEventMetadataSchema,
  type ChatSystemEventMetadata,
} from "@dhruto/contracts";

/** Tracking codes are short public identifiers; anything else is dropped. */
const TRACKING_CODE = /^[A-Za-z0-9-]{1,50}$/;
const FAILURE_REASONS = new Set<string>(Object.values(DeliveryFailureReason));

function str(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function isoDate(value: string | null): string | null {
  if (!value || value.length > 40) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

/**
 * Controlled logistics event → SYSTEM_EVENT mapping (Phase 5).
 *
 * Only the lifecycle events listed here ever produce a chat message, and only
 * with an allow-listed, scalar param set: the public tracking code, plus the
 * `DeliveryFailureReason` enum code and reschedule date for failures. Names,
 * phones, addresses, COD amounts, rider/hub ids and free text are never
 * copied — the same message is visible to customers, merchants and riders.
 * Returns null for events that must not produce a message.
 */
export function logisticsSystemMessage(
  eventType: DomainEventType,
  payload: Record<string, unknown>,
): ChatSystemEventMetadata | null {
  const trackingCode = str(payload, "trackingCode");
  const params: Record<string, string> = {};
  if (trackingCode && TRACKING_CODE.test(trackingCode)) params.trackingCode = trackingCode;

  let eventKey: string;
  switch (eventType) {
    case DomainEventType.PARCEL_ASSIGNED:
      eventKey =
        payload.reassigned === true
          ? CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED
          : CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED;
      break;
    case DomainEventType.PARCEL_OUT_FOR_DELIVERY:
      eventKey = CHAT_LOGISTICS_EVENT_KEYS.OUT_FOR_DELIVERY;
      break;
    case DomainEventType.PARCEL_DELIVERED:
      eventKey = CHAT_LOGISTICS_EVENT_KEYS.DELIVERED;
      break;
    case DomainEventType.PARCEL_FAILED: {
      eventKey = CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED;
      const reason = str(payload, "reason");
      if (reason && FAILURE_REASONS.has(reason)) params.reason = reason;
      const rescheduledFor = isoDate(str(payload, "rescheduledFor"));
      if (rescheduledFor) params.rescheduledFor = rescheduledFor;
      break;
    }
    case DomainEventType.PARCEL_RETURNED:
      eventKey = CHAT_LOGISTICS_EVENT_KEYS.RETURNED;
      break;
    default:
      return null;
  }

  const metadata = Object.keys(params).length > 0 ? { eventKey, params } : { eventKey };
  // Defence in depth: the result must satisfy the shared contract.
  return chatSystemEventMetadataSchema.parse(metadata);
}
