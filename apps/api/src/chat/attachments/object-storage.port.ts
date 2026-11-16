/**
 * The single object-storage abstraction of the communication platform
 * (Phase 6). Implementations: `S3ObjectStorage` (AWS S3 / S3-compatible) and
 * an in-memory fake for unit tests. Keys are always server-generated.
 */
export const CHAT_OBJECT_STORAGE = Symbol("CHAT_OBJECT_STORAGE");

export interface PresignedUpload {
  url: string;
  /** Headers the client must send verbatim (they are part of the signature). */
  headers: Record<string, string>;
}

export interface StoredObjectInfo {
  sizeBytes: number;
  lastModified: Date | null;
}

export interface ListedObject {
  key: string;
  lastModified: Date | null;
}

export interface ChatObjectStorage {
  presignPut(
    key: string,
    options: { contentType: string; expiresInSeconds: number },
  ): Promise<PresignedUpload>;
  presignGet(
    key: string,
    options: {
      expiresInSeconds: number;
      /** Served Content-Type (the VERIFIED type, never the stored metadata). */
      contentType: string;
      disposition: "inline" | "attachment";
      filename: string;
    },
  ): Promise<string>;
  /** Null when the object does not exist. */
  head(key: string): Promise<StoredObjectInfo | null>;
  /** Streams the object body; null when it does not exist. */
  read(key: string): Promise<AsyncIterable<Uint8Array> | null>;
  /** Idempotent: deleting a missing object succeeds. */
  delete(key: string): Promise<void>;
  /** One bounded page of keys under `prefix`, in lexical order after `startAfter`. */
  list(
    prefix: string,
    options: { startAfter?: string; maxKeys: number },
  ): Promise<{
    objects: ListedObject[];
    nextStartAfter: string | null;
  }>;
}
