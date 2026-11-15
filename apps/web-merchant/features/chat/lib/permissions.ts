import {
  ChatMessageType,
  ChatParticipantCapability,
  isConversationWritable,
  type ChatConversationStatus,
} from "@dhruto/contracts";
import { type TimelineMessage } from "./timeline";

/**
 * UI affordances derived from the backend's own capability list
 * (`myParticipation.capabilities`) and the shared lifecycle rule. This only
 * hides controls the user cannot use; the backend re-authorizes every call.
 */
export interface ConversationCaps {
  writable: boolean;
  canSend: boolean;
  canReact: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  canPin: boolean;
  canReport: boolean;
  canRemoveAny: boolean;
}

export const NO_CAPS: ConversationCaps = {
  writable: false,
  canSend: false,
  canReact: false,
  canEditOwn: false,
  canDeleteOwn: false,
  canPin: false,
  canReport: false,
  canRemoveAny: false,
};

export function conversationCaps(
  status: ChatConversationStatus,
  capabilities: readonly ChatParticipantCapability[],
): ConversationCaps {
  const has = (capability: ChatParticipantCapability) => capabilities.includes(capability);
  return {
    writable: isConversationWritable(status),
    canSend: has(ChatParticipantCapability.SEND_MESSAGE),
    canReact: has(ChatParticipantCapability.REACT),
    canEditOwn: has(ChatParticipantCapability.EDIT_OWN_MESSAGE),
    canDeleteOwn: has(ChatParticipantCapability.DELETE_OWN_MESSAGE),
    canPin: has(ChatParticipantCapability.PIN_MESSAGE),
    canReport: has(ChatParticipantCapability.REPORT_MESSAGE),
    canRemoveAny: has(ChatParticipantCapability.REMOVE_ANY_MESSAGE),
  };
}

export interface MessagePermissions {
  reply: boolean;
  react: boolean;
  edit: boolean;
  delete: boolean;
  pin: boolean;
  report: boolean;
  remove: boolean;
}

const EDITABLE: ReadonlySet<ChatMessageType> = new Set([
  ChatMessageType.TEXT,
  ChatMessageType.IMAGE,
  ChatMessageType.FILE,
  ChatMessageType.LOCATION,
  ChatMessageType.QUICK_ACTION,
]);

export function messagePermissions(message: TimelineMessage, mine: boolean, caps: ConversationCaps): MessagePermissions {
  const live = message.localState === "sent" && !message.deletedAt && message.type !== ChatMessageType.SYSTEM_EVENT;
  const human = message.senderId !== null;
  return {
    reply: live && caps.writable && caps.canSend,
    react: live && caps.writable && caps.canReact,
    edit:
      live &&
      mine &&
      caps.writable &&
      caps.canEditOwn &&
      EDITABLE.has(message.type) &&
      (message.type === ChatMessageType.TEXT || message.content !== null),
    delete: live && mine && caps.writable && caps.canDeleteOwn,
    pin: live && caps.writable && caps.canPin,
    report: live && !mine && human && caps.canReport,
    // Moderation works in any status (e.g. a locked conversation).
    remove: live && !mine && human && caps.canRemoveAny,
  };
}
