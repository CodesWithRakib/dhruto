import {
  ChatMessageDeliveryStatus,
  ChatMessageType,
  type ChatAttachmentItem,
  type ChatMessageItem,
  type ChatMessageMetadata,
  type ChatReactionSummary,
} from "@dhruto/contracts";

/**
 * Pure timeline helpers (no React, no Redux) — unit tested in isolation.
 *
 * Ordering rule (Phase 1 ADR-002): the per-conversation `sequence` (BIGINT,
 * carried as a decimal string) is the only authoritative order. Pending
 * optimistic messages have no sequence yet and sort after every persisted one
 * in local creation order.
 */

export type LocalSendState = "sent" | "pending" | "failed";

export interface TimelineMessage {
  /**
   * Stable list key. Human messages always carry a client message id (the
   * backend requires it), so the optimistic bubble and its canonical server
   * version share one key and never remount or duplicate.
   */
  key: string;
  id: string | null;
  clientMessageId: string | null;
  conversationId: string;
  sequence: string | null;
  senderId: string | null;
  type: ChatMessageType;
  content: string | null;
  replyToMessageId: string | null;
  metadata: ChatMessageMetadata | null;
  attachments: ChatAttachmentItem[];
  reactions: ChatReactionSummary[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  localState: LocalSendState;
  /** Last send error (failed optimistic messages only). */
  error: string | null;
}

export function messageKey(message: Pick<ChatMessageItem, "id" | "clientMessageId">): string {
  return message.clientMessageId ?? message.id;
}

export function fromServer(message: ChatMessageItem): TimelineMessage {
  return {
    key: messageKey(message),
    id: message.id,
    clientMessageId: message.clientMessageId,
    conversationId: message.conversationId,
    sequence: message.sequence,
    senderId: message.senderId,
    type: message.type,
    content: message.content,
    replyToMessageId: message.replyToMessageId,
    metadata: message.metadata,
    attachments: message.attachments,
    reactions: message.reactions,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    localState: "sent",
    error: null,
  };
}

/** BIGINT-safe comparison of sequence strings. */
export function compareSequence(a: string, b: string): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x < y ? -1 : 1;
}

export function maxSequence(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return compareSequence(a, b) >= 0 ? a : b;
}

/** Persisted messages by sequence, then pending/failed ones by creation time. */
export function compareTimeline(a: TimelineMessage, b: TimelineMessage): number {
  if (a.sequence !== null && b.sequence !== null) return compareSequence(a.sequence, b.sequence);
  if (a.sequence !== null) return -1;
  if (b.sequence !== null) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Merges an incoming canonical message into the existing local copy.
 * The server is authoritative, with two monotonic exceptions that protect
 * against out-of-order realtime/REST delivery: a deletion is terminal, and a
 * newer edit is never replaced by an older snapshot.
 */
export function mergeMessage(existing: TimelineMessage | undefined, incoming: TimelineMessage): TimelineMessage {
  if (!existing) return incoming;
  if (existing.deletedAt && !incoming.deletedAt) return existing;
  const incomingIsOlderEdit =
    existing.editedAt !== null &&
    !incoming.deletedAt &&
    (incoming.editedAt === null || existing.editedAt > incoming.editedAt);
  // Keep the newer text, but take everything else (e.g. reactions) from the incoming snapshot.
  if (incomingIsOlderEdit) return { ...incoming, content: existing.content, editedAt: existing.editedAt };
  return incoming;
}

/**
 * Highest sequence S such that every sequence from `from` to S is present
 * (the client's `lastSeenSequence`). Used to detect gaps after reconnects.
 */
export function contiguousHead(sequences: readonly string[], from: string): string {
  const present = new Set(sequences);
  let head = BigInt(from);
  while (present.has((head + 1n).toString())) head += 1n;
  return head.toString();
}

/** Delivery state of one of MY messages, derived from other participants' cursors. */
export function deliveryState(
  message: TimelineMessage,
  myUserId: string,
  cursors: Readonly<Record<string, { read: string; delivered: string }>>,
): ChatMessageDeliveryStatus {
  if (message.localState === "pending") return ChatMessageDeliveryStatus.PENDING;
  if (message.localState === "failed") return ChatMessageDeliveryStatus.FAILED;
  if (message.sequence === null) return ChatMessageDeliveryStatus.PENDING;
  let delivered = false;
  for (const [userId, cursor] of Object.entries(cursors)) {
    if (userId === myUserId) continue;
    if (compareSequence(cursor.read, message.sequence) >= 0) return ChatMessageDeliveryStatus.READ;
    if (compareSequence(cursor.delivered, message.sequence) >= 0) delivered = true;
  }
  return delivered ? ChatMessageDeliveryStatus.DELIVERED : ChatMessageDeliveryStatus.SENT;
}

/* ------------------------------------------------------------------ */
/* Rendering rows: date separators + grouping                          */
/* ------------------------------------------------------------------ */

export type TimelineRow =
  | { kind: "date"; key: string; date: string }
  | { kind: "message"; key: string; message: TimelineMessage; firstInGroup: boolean; lastInGroup: boolean };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupable(a: TimelineMessage, b: TimelineMessage): boolean {
  if (a.type === ChatMessageType.SYSTEM_EVENT || b.type === ChatMessageType.SYSTEM_EVENT) return false;
  if (a.senderId !== b.senderId) return false;
  if (dayKey(a.createdAt) !== dayKey(b.createdAt)) return false;
  return Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) <= GROUP_WINDOW_MS;
}

/** Builds display rows (local-day separators, consecutive-sender grouping). */
export function buildRows(messages: readonly TimelineMessage[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  messages.forEach((message, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];
    if (!prev || dayKey(prev.createdAt) !== dayKey(message.createdAt)) {
      rows.push({ kind: "date", key: `date-${dayKey(message.createdAt)}`, date: message.createdAt });
    }
    rows.push({
      kind: "message",
      key: message.key,
      message,
      firstInGroup: !prev || !groupable(prev, message),
      lastInGroup: !next || !groupable(message, next),
    });
  });
  return rows;
}

/** Splits text around case-insensitive matches of the query terms (safe: no HTML). */
export function highlightParts(text: string, query: string): Array<{ text: string; match: boolean }> {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length >= 2)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (terms.length === 0) return [{ text, match: false }];
  const splitter = new RegExp(`(${terms.join("|")})`, "gi");
  const isTerm = new RegExp(`^(?:${terms.join("|")})$`, "i");
  return text
    .split(splitter)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: isTerm.test(part) }));
}
