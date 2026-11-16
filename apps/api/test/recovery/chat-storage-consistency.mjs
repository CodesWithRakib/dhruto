// Communication Phase 8 — database ↔ object-storage consistency report (read-only).
//
//   DATABASE_URL=… CHAT_STORAGE_BUCKET=… [CHAT_STORAGE_ENDPOINT=… CHAT_STORAGE_FORCE_PATH_STYLE=true
//   CHAT_STORAGE_ACCESS_KEY_ID=… CHAT_STORAGE_SECRET_ACCESS_KEY=…] node test/recovery/chat-storage-consistency.mjs
//
// After restoring PostgreSQL and/or object storage from backups taken at
// different times, reports:
//   missingObjects  — UPLOADED, non-purged attachment rows whose object is gone
//                     (downloads would fail; evidence may be lost)
//   orphanObjects   — objects under chat/ with no attachment row (the cleanup
//                     job deletes them after the pending TTL)
// Prints counts and at most 20 attachment ids — never storage keys or URLs.
// Never deletes anything.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const bucket = process.env.CHAT_STORAGE_BUCKET;
if (!process.env.DATABASE_URL || !bucket)
  throw new Error("DATABASE_URL and CHAT_STORAGE_BUCKET are required");
const s3 = new S3Client({
  region: process.env.CHAT_STORAGE_REGION ?? "us-east-1",
  endpoint: process.env.CHAT_STORAGE_ENDPOINT || undefined,
  forcePathStyle: process.env.CHAT_STORAGE_FORCE_PATH_STYLE === "true",
  credentials: process.env.CHAT_STORAGE_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.CHAT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CHAT_STORAGE_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const objects = new Set();
let token;
do {
  const page = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: "chat/", ContinuationToken: token }),
  );
  for (const o of page.Contents ?? []) objects.add(o.Key);
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query(
  `SELECT id, storage_key, status, scan_status, object_purged_at, message_id FROM chat_attachments`,
);
await db.end();

const known = new Set(rows.map((r) => r.storage_key));
const missing = rows.filter(
  (r) => r.status === "UPLOADED" && !r.object_purged_at && !objects.has(r.storage_key),
);
const orphans = [...objects].filter((k) => !known.has(k));
console.log(
  JSON.stringify(
    {
      attachmentRows: rows.length,
      objects: objects.size,
      missingObjects: missing.length,
      missingSample: missing
        .slice(0, 20)
        .map((r) => ({ id: r.id, linked: r.message_id !== null, scanStatus: r.scan_status })),
      orphanObjects: orphans.length,
    },
    null,
    1,
  ),
);
process.exitCode = missing.length > 0 ? 2 : 0;
