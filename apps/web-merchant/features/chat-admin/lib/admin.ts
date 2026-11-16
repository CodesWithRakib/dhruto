import {
  ChatAttachmentScanStatus,
  ChatEscalationStatus,
  ChatPermission,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import { type StatusTone } from "@/config/status";

/**
 * UI affordance only: hides controls the caller cannot use. Every call is
 * re-authorized by the backend (effective permissions incl. grants).
 */
export function can(profile: ChatStaffProfile | undefined, permission: ChatPermission): boolean {
  return profile?.permissions.includes(permission) ?? false;
}

export const ESCALATION_TONE: Readonly<Record<ChatEscalationStatus, StatusTone>> = {
  [ChatEscalationStatus.OPEN]: "warning",
  [ChatEscalationStatus.IN_REVIEW]: "info",
  [ChatEscalationStatus.ESCALATED]: "danger",
  [ChatEscalationStatus.RESOLVED]: "success",
  [ChatEscalationStatus.CLOSED]: "neutral",
};

export const SCAN_TONE: Readonly<Record<ChatAttachmentScanStatus, StatusTone>> = {
  [ChatAttachmentScanStatus.PENDING]: "warning",
  [ChatAttachmentScanStatus.CLEAN]: "success",
  [ChatAttachmentScanStatus.INFECTED]: "danger",
  [ChatAttachmentScanStatus.FAILED]: "danger",
};

/** Locale-aware short date-time. */
export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** Opens a short-lived URL served with Content-Disposition: attachment. */
export function triggerDownload(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export { ChatPermission };
