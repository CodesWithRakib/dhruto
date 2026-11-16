import { type RateLimitOptions } from "../common/rate-limit/rate-limit.decorator.js";

/**
 * Chat tunables. Rate limits are per authenticated user (RateLimitGuard keys
 * by user id), use fixed 60-second windows and are configurable through
 * environment variables read at startup. Defaults are abuse limits, not
 * capacity targets.
 */
function envInt(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

const perMinute = (scope: string, envName: string, fallback: number): RateLimitOptions => ({
  scope,
  windowSeconds: 60,
  limit: envInt(envName, fallback, 1),
});

export const CHAT_RATE_LIMITS = {
  send: perMinute("chat-send", "CHAT_RATE_LIMIT_SEND_PER_MIN", 60),
  createConversation: perMinute("chat-create", "CHAT_RATE_LIMIT_CREATE_PER_MIN", 20),
  react: perMinute("chat-react", "CHAT_RATE_LIMIT_REACT_PER_MIN", 120),
  report: perMinute("chat-report", "CHAT_RATE_LIMIT_REPORT_PER_MIN", 10),
  search: perMinute("chat-search", "CHAT_RATE_LIMIT_SEARCH_PER_MIN", 30),
  participants: perMinute("chat-participants", "CHAT_RATE_LIMIT_PARTICIPANTS_PER_MIN", 30),
  cursor: perMinute("chat-cursor", "CHAT_RATE_LIMIT_CURSOR_PER_MIN", 240),
  mutate: perMinute("chat-mutate", "CHAT_RATE_LIMIT_MUTATE_PER_MIN", 60),
  read: perMinute("chat-read", "CHAT_RATE_LIMIT_READ_PER_MIN", 300),
  admin: perMinute("chat-admin", "CHAT_RATE_LIMIT_ADMIN_PER_MIN", 120),
  /** Phase 6: reserve/complete/cancel attachment uploads. */
  upload: perMinute("chat-upload", "CHAT_RATE_LIMIT_UPLOAD_PER_MIN", 30),
  /** Phase 6: authorized download URL issuance. */
  download: perMinute("chat-download", "CHAT_RATE_LIMIT_DOWNLOAD_PER_MIN", 240),
} as const;

/** Seconds after sending during which a sender may edit (0 disables editing). */
export const CHAT_EDIT_WINDOW_SECONDS = envInt("CHAT_MESSAGE_EDIT_WINDOW_SECONDS", 900);

/** Aggregate type used for every chat outbox event. */
export const CHAT_AGGREGATE_TYPE = "chat_conversation";
