import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ApiErrorCode } from "@dhruto/contracts";

/**
 * Chat error factories. Each maps to a stable `ApiErrorCode` (surfaced as
 * `errorCode` by AllExceptionsFilter).
 *
 * Enumeration safety: a conversation or message the caller cannot access is
 * reported exactly like one that does not exist (404), so ids cannot be
 * probed. 403 is used only inside a conversation the caller can already see.
 */
export const chatErrors = {
  conversationNotFound: () =>
    new NotFoundException({
      message: "Conversation not found",
      error: ApiErrorCode.CHAT_CONVERSATION_NOT_FOUND,
    }),
  messageNotFound: () =>
    new NotFoundException({
      message: "Message not found",
      error: ApiErrorCode.CHAT_MESSAGE_NOT_FOUND,
    }),
  forbidden: (message: string) =>
    new ForbiddenException({ message, error: ApiErrorCode.CHAT_FORBIDDEN }),
  permissionDenied: (message: string) =>
    new ForbiddenException({ message, error: ApiErrorCode.CHAT_PERMISSION_DENIED }),
  notWritable: (status: string) =>
    new ConflictException({
      message: `Conversation is ${status} and does not accept changes`,
      error: ApiErrorCode.CHAT_CONVERSATION_NOT_WRITABLE,
    }),
  invalidTransition: (from: string, to: string) =>
    new ConflictException({
      message: `Cannot change conversation status from ${from} to ${to}`,
      error: ApiErrorCode.CHAT_INVALID_TRANSITION,
    }),
  scopeInvalid: (message: string) =>
    new UnprocessableEntityException({ message, error: ApiErrorCode.CHAT_SCOPE_INVALID }),
  participantIneligible: (message = "User is not eligible to join this conversation") =>
    new UnprocessableEntityException({ message, error: ApiErrorCode.CHAT_PARTICIPANT_INELIGIBLE }),
  participantNotFound: () =>
    new NotFoundException({
      message: "Participant not found",
      error: ApiErrorCode.CHAT_PARTICIPANT_NOT_FOUND,
    }),
  participantLimit: (max: number) =>
    new UnprocessableEntityException({
      message: `Conversations are limited to ${max} participants`,
      error: ApiErrorCode.CHAT_PARTICIPANT_LIMIT,
    }),
  invalidSequence: () =>
    new UnprocessableEntityException({
      message: "Sequence is beyond the latest message in this conversation",
      error: ApiErrorCode.CHAT_INVALID_SEQUENCE,
    }),
  notEditable: (message: string) =>
    new UnprocessableEntityException({ message, error: ApiErrorCode.CHAT_MESSAGE_NOT_EDITABLE }),
  editWindowExpired: () =>
    new UnprocessableEntityException({
      message: "The edit window for this message has expired",
      error: ApiErrorCode.CHAT_EDIT_WINDOW_EXPIRED,
    }),
  replyInvalid: () =>
    new UnprocessableEntityException({
      message: "Reply target does not exist in this conversation",
      error: ApiErrorCode.CHAT_REPLY_INVALID,
    }),
  attachmentInvalid: (message: string) =>
    new UnprocessableEntityException({ message, error: ApiErrorCode.CHAT_ATTACHMENT_INVALID }),
  /** Unknown, not visible to the caller, not ready, or of a deleted message — indistinguishable. */
  attachmentNotFound: () =>
    new NotFoundException({
      message: "Attachment not found",
      error: ApiErrorCode.CHAT_ATTACHMENT_NOT_FOUND,
    }),
  storageUnavailable: () =>
    new ServiceUnavailableException({
      message: "Attachments are temporarily unavailable",
      error: ApiErrorCode.CHAT_STORAGE_UNAVAILABLE,
    }),
  duplicateReport: () =>
    new ConflictException({
      message: "You have already reported this message",
      error: ApiErrorCode.CHAT_DUPLICATE_REPORT,
    }),
  limitExceeded: (message: string) =>
    new UnprocessableEntityException({ message, error: ApiErrorCode.CHAT_LIMIT_EXCEEDED }),
  reasonRequired: () =>
    new UnprocessableEntityException({
      message: "A reason is required for this staff action",
      error: ApiErrorCode.CHAT_REASON_REQUIRED,
    }),
  noteNotFound: () =>
    new NotFoundException({
      message: "Internal note not found",
      error: ApiErrorCode.CHAT_NOTE_NOT_FOUND,
    }),
  reportNotFound: () =>
    new NotFoundException({
      message: "Report not found",
      error: ApiErrorCode.CHAT_REPORT_NOT_FOUND,
    }),
  cursorInvalid: () =>
    new UnprocessableEntityException({
      message: "Invalid cursor",
      error: ApiErrorCode.CHAT_CURSOR_INVALID,
    }),
};
