import { ApiErrorCode } from "@dhruto/contracts";

/** Keys under the `Chat.errors` translation namespace. */
export type ChatErrorKey =
  | "network"
  | "notWritable"
  | "notFound"
  | "forbidden"
  | "rateLimited"
  | "validation"
  | "editWindow"
  | "notEditable"
  | "duplicateReport"
  | "generic";

/**
 * Maps a rejected RTK Query call (`{ status, data: { errorCode } }`) to a
 * translatable chat error key. Never surfaces raw backend text.
 */
export function chatErrorKey(error: unknown): ChatErrorKey {
  if (typeof error !== "object" || error === null) return "generic";
  const status = "status" in error ? error.status : undefined;
  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") return "network";
  if (status === 429) return "rateLimited";
  const data = "data" in error ? error.data : undefined;
  const code =
    typeof data === "object" && data !== null && "errorCode" in data && typeof data.errorCode === "string"
      ? data.errorCode
      : null;
  switch (code) {
    case ApiErrorCode.CHAT_CONVERSATION_NOT_WRITABLE:
      return "notWritable";
    case ApiErrorCode.CHAT_CONVERSATION_NOT_FOUND:
    case ApiErrorCode.CHAT_MESSAGE_NOT_FOUND:
      return "notFound";
    case ApiErrorCode.CHAT_FORBIDDEN:
    case ApiErrorCode.CHAT_PERMISSION_DENIED:
      return "forbidden";
    case ApiErrorCode.RATE_LIMIT_EXCEEDED:
      return "rateLimited";
    case ApiErrorCode.VALIDATION_ERROR:
    case ApiErrorCode.CHAT_REPLY_INVALID:
      return "validation";
    case ApiErrorCode.CHAT_EDIT_WINDOW_EXPIRED:
      return "editWindow";
    case ApiErrorCode.CHAT_MESSAGE_NOT_EDITABLE:
      return "notEditable";
    case ApiErrorCode.CHAT_DUPLICATE_REPORT:
      return "duplicateReport";
    default:
      return "generic";
  }
}
