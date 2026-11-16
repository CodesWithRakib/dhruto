import { type ChatMessageDeliveryStatus } from "@dhruto/contracts";
import { type TimelineMessage } from "../lib/timeline";
import { type ConversationCaps } from "../lib/permissions";

export interface MessageBubbleHandlers {
  onReply: (message: TimelineMessage) => void;
  onEdit: (message: TimelineMessage) => void;
  onDelete: (message: TimelineMessage) => void;
  onRemove: (message: TimelineMessage) => void;
  onReport: (message: TimelineMessage) => void;
  onTogglePin: (message: TimelineMessage, pinned: boolean) => void;
  onToggleReaction: (message: TimelineMessage, reaction: string) => void;
  onRetry: (message: TimelineMessage) => void;
  onDiscard: (message: TimelineMessage) => void;
  onJumpTo: (messageId: string) => void;
}

export interface MessageBubbleProps {
  message: TimelineMessage;
  mine: boolean;
  senderLabel: string;
  showSender: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  /** Reply target as stored (stable reference); null when not loaded. */
  replyTarget?: TimelineMessage | null;
  replyName?: string;
  pinned: boolean;
  delivery: ChatMessageDeliveryStatus | null;
  highlighted: boolean;
  locale: string;
  /** Stable, memoized per conversation (keeps React.memo effective). */
  caps: ConversationCaps;
  handlers: MessageBubbleHandlers;
}
