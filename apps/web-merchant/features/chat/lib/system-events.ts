import {
  CHAT_LOGISTICS_EVENT_KEYS,
  DeliveryFailureReason,
  type ChatMessageMetadata,
} from "@dhruto/contracts";
import { type ChatTranslator } from "./display";

const FAILURE_REASONS = new Set<string>(Object.values(DeliveryFailureReason));

/** Logistics event key -> `Chat.system.*` message key. */
const LOGISTICS_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  [CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED]: "system.riderAssigned",
  [CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED]: "system.riderReassigned",
  [CHAT_LOGISTICS_EVENT_KEYS.OUT_FOR_DELIVERY]: "system.outForDelivery",
  [CHAT_LOGISTICS_EVENT_KEYS.DELIVERED]: "system.delivered",
  [CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED]: "system.deliveryFailed",
  [CHAT_LOGISTICS_EVENT_KEYS.RETURNED]: "system.returned",
};

function param(metadata: ChatMessageMetadata, key: string): string | null {
  if (!("eventKey" in metadata) || !metadata.params) return null;
  const value = metadata.params[key];
  return typeof value === "string" ? value : null;
}

/**
 * Human text for a SYSTEM_EVENT message. Only known event keys and
 * allow-listed params are rendered (tracking code; failure reason as a
 * translated enum); anything else falls back to a generic notice, so a
 * system message can never inject arbitrary text.
 */
export function systemEventText(metadata: ChatMessageMetadata | null, t: ChatTranslator): string {
  if (!metadata || !("eventKey" in metadata)) return t("systemEvent");
  if (metadata.eventKey === "chat.staff_joined") return t("systemStaffJoined");
  const messageKey = LOGISTICS_MESSAGE_KEYS[metadata.eventKey];
  if (!messageKey) return t("systemEvent");

  const code = param(metadata, "trackingCode");
  // The backend always includes the tracking code; without it, stay generic.
  if (!code) return t("parcelUpdated");
  const text = t(messageKey, { code });
  const reason = param(metadata, "reason");
  if (metadata.eventKey === CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED && reason && FAILURE_REASONS.has(reason)) {
    return `${text} ${t("system.failureReason", { reason: t(`failureReasons.${reason}`) })}`;
  }
  return text;
}
