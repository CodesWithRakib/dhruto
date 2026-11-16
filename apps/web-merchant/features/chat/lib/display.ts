import {
  type ChatConversationType,
  type ChatPageSender,
  type ChatParcelContext,
} from "@dhruto/contracts";

/** Minimal translator signature (next-intl `useTranslations("Chat")`). */
export type ChatTranslator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Conversation display name. The inbox summary carries `title` but no
 * participant names (backend contract), so untitled conversations — DIRECT
 * and PARCEL_DELIVERY — fall back to their localized type, never to invented
 * metadata. The detail view (participants loaded) can do better; see
 * `conversationTitleWithParticipants`.
 */
export function conversationTitle(
  conversation: {
    title: string | null;
    type: ChatConversationType;
    parcel?: Pick<ChatParcelContext, "trackingCode"> | null;
  },
  t: ChatTranslator,
): string {
  const title = conversation.title?.trim();
  if (title) return title;
  // Phase 5: parcel-linked threads are named by their server-provided tracking code.
  if (conversation.parcel) return t("parcelTitle", { code: conversation.parcel.trackingCode });
  return t(`types.${conversation.type}`);
}

/** Detail view: untitled DIRECT conversations show the other participant's name. */
export function conversationTitleWithParticipants(
  conversation: {
    title: string | null;
    type: ChatConversationType;
    parcel?: Pick<ChatParcelContext, "trackingCode"> | null;
  },
  participants: ReadonlyArray<{ userId: string; displayName: string }>,
  myUserId: string,
  t: ChatTranslator,
): string {
  if (!conversation.title?.trim() && conversation.type === "DIRECT") {
    const other = participants.find((participant) => participant.userId !== myUserId);
    if (other) return other.displayName;
  }
  return conversationTitle(conversation, t);
}

export function senderName(
  senders: Readonly<Record<string, ChatPageSender>>,
  senderId: string | null,
  myUserId: string,
  t: ChatTranslator,
): string {
  if (!senderId) return t("systemEvent");
  if (senderId === myUserId) return t("you");
  return senders[senderId]?.displayName ?? t("unknownUser");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}` : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function formatClock(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Day separator label: Today / Yesterday / weekday (this week) / full date. */
export function formatDayLabel(iso: string, locale: string, t: ChatTranslator, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return t("today");
  if (days === 1) return t("yesterday");
  if (days > 1 && days < 7) return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Compact inbox timestamp: time today, weekday this week, short date otherwise. */
export function formatListTime(iso: string, locale: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return formatClock(iso, locale);
  if (days > 0 && days < 7) return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
}
