/**
 * Phase 6 attachment/storage tunables, read from the environment at startup
 * (same convention as `chat.config.ts`). Storage is OFF unless a bucket is
 * configured: attachment endpoints then fail closed with 503 instead of
 * pretending to work. Credentials are optional — when omitted the AWS SDK
 * default provider chain (instance role, env, profile) is used. Never log
 * these values.
 */

function envInt(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export interface ChatStorageConfig {
  bucket: string;
  region: string;
  /** S3-compatible endpoint used by the API (MinIO, LocalStack, R2…). */
  endpoint?: string;
  /** Endpoint used in presigned URLs when browsers reach storage via another host. */
  publicEndpoint?: string;
  forcePathStyle: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface ChatAttachmentTunables {
  /** Presigned PUT lifetime. */
  uploadUrlTtlSeconds: number;
  /** Presigned GET lifetime. */
  downloadUrlTtlSeconds: number;
  /** PENDING reservations older than this are expired and cleaned up. */
  pendingTtlSeconds: number;
  /** UPLOADED attachments never attached to a message are removed after this. */
  unsentTtlSeconds: number;
  /** REJECTED rows (object already deleted) are purged after this. */
  rejectedRetentionSeconds: number;
  cleanupIntervalMs: number;
  cleanupBatchSize: number;
  /** Max PENDING reservations a user may hold at once (abuse protection). */
  maxPendingPerUser: number;
}

export function loadChatStorageConfig(): ChatStorageConfig | null {
  const bucket = envString("CHAT_STORAGE_BUCKET");
  if (!bucket) return null;
  return {
    bucket,
    region: envString("CHAT_STORAGE_REGION") ?? "us-east-1",
    endpoint: envString("CHAT_STORAGE_ENDPOINT"),
    publicEndpoint: envString("CHAT_STORAGE_PUBLIC_ENDPOINT"),
    forcePathStyle: process.env.CHAT_STORAGE_FORCE_PATH_STYLE === "true",
    accessKeyId: envString("CHAT_STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: envString("CHAT_STORAGE_SECRET_ACCESS_KEY"),
  };
}

export function loadChatAttachmentTunables(): ChatAttachmentTunables {
  const upload = envInt("CHAT_UPLOAD_URL_TTL_SECONDS", 300, 30);
  return {
    uploadUrlTtlSeconds: upload,
    downloadUrlTtlSeconds: envInt("CHAT_DOWNLOAD_URL_TTL_SECONDS", 300, 30),
    // Must outlive the presigned PUT so no upload can land after cleanup.
    pendingTtlSeconds: Math.max(envInt("CHAT_PENDING_UPLOAD_TTL_SECONDS", 3600, 60), upload * 2),
    unsentTtlSeconds: envInt("CHAT_UNSENT_ATTACHMENT_TTL_SECONDS", 86_400, 300),
    rejectedRetentionSeconds: envInt("CHAT_REJECTED_ATTACHMENT_RETENTION_SECONDS", 7 * 86_400, 0),
    cleanupIntervalMs: envInt("CHAT_ATTACHMENT_CLEANUP_INTERVAL_MS", 10 * 60_000, 10_000),
    cleanupBatchSize: envInt("CHAT_ATTACHMENT_CLEANUP_BATCH", 100, 1),
    maxPendingPerUser: envInt("CHAT_MAX_PENDING_UPLOADS_PER_USER", 20, 1),
  };
}

/** Server-generated object key: no user input (filenames never reach storage paths). */
export function attachmentStorageKey(conversationId: string, attachmentId: string): string {
  return `chat/${conversationId}/${attachmentId}`;
}

export const CHAT_STORAGE_KEY_PREFIX = "chat/";
