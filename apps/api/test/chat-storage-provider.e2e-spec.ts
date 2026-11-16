import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { S3ObjectStorage } from "../src/chat/attachments/s3-object-storage.js";
import {
  attachmentStorageKey,
  type ChatStorageConfig,
} from "../src/chat/attachments/attachment.config.js";

/**
 * Communication Phase 8 — REAL storage-provider verification suite.
 *
 * Exercises the production S3 adapter against a DEDICATED, NON-PRODUCTION
 * bucket of the intended provider. Never point it at a production bucket.
 * Credentials come only from the environment and are never printed.
 *
 *   CHAT_PROVIDER_TEST_BUCKET            dedicated test bucket (required)
 *   CHAT_PROVIDER_TEST_REGION            region (default us-east-1)
 *   CHAT_PROVIDER_TEST_ENDPOINT          S3-compatible endpoint (omit for AWS)
 *   CHAT_PROVIDER_TEST_FORCE_PATH_STYLE  "true" for MinIO/LocalStack
 *   CHAT_PROVIDER_TEST_ACCESS_KEY_ID / _SECRET_ACCESS_KEY  (omit to use the SDK chain)
 *   CHAT_PROVIDER_TEST_ALLOWED_ORIGIN    web origin configured in bucket CORS
 *   CHAT_PROVIDER_TEST_EMULATOR=1        emulator run: skips checks emulators do not enforce
 *                                        (anonymous access, IAM prefix scope). A run with this
 *                                        flag is NOT provider verification.
 *   CHAT_PROVIDER_TEST_EXPECT_PREFIX_SCOPE=1  assert API credentials cannot write outside chat/
 */
const BUCKET = process.env.CHAT_PROVIDER_TEST_BUCKET;
const EMULATOR = process.env.CHAT_PROVIDER_TEST_EMULATOR === "1";
const ORIGIN = process.env.CHAT_PROVIDER_TEST_ALLOWED_ORIGIN;

function config(): ChatStorageConfig {
  return {
    bucket: BUCKET as string,
    region: process.env.CHAT_PROVIDER_TEST_REGION ?? "us-east-1",
    endpoint: process.env.CHAT_PROVIDER_TEST_ENDPOINT || undefined,
    forcePathStyle: process.env.CHAT_PROVIDER_TEST_FORCE_PATH_STYLE === "true",
    accessKeyId: process.env.CHAT_PROVIDER_TEST_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.CHAT_PROVIDER_TEST_SECRET_ACCESS_KEY || undefined,
  };
}

const bytes = new TextEncoder().encode("%PDF-1.7\nprovider verification\n%%EOF\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function objectUrl(key: string): string {
  const c = config();
  if (c.endpoint) {
    const base = c.endpoint.replace(/\/$/, "");
    return c.forcePathStyle
      ? `${base}/${c.bucket}/${key}`
      : base.replace("://", `://${c.bucket}.`) + `/${key}`;
  }
  return `https://${c.bucket}.s3.${c.region}.amazonaws.com/${key}`;
}

describe.skipIf(!BUCKET)("Phase 8 — storage provider verification", () => {
  const storage = () => new S3ObjectStorage(config());
  const key = attachmentStorageKey(randomUUID(), randomUUID());

  it("uses server-generated keys under the chat/ prefix only", () => {
    expect(key).toMatch(/^chat\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  });

  it("presigned PUT accepts exactly the signed content type and rejects tampering", async () => {
    const up = await storage().presignPut(key, {
      contentType: "application/pdf",
      expiresInSeconds: 60,
    });
    const tampered = await fetch(up.url, {
      method: "PUT",
      headers: { ...up.headers, "content-type": "text/html" },
      body: bytes,
    });
    if (!EMULATOR) expect(tampered.status).toBe(403);
    const ok = await fetch(up.url, { method: "PUT", headers: up.headers, body: bytes });
    expect(ok.status).toBe(200);
    const head = await storage().head(key);
    expect(head?.sizeBytes).toBe(bytes.byteLength);
  });

  it("the stored bytes are exactly what was uploaded (server-side verification basis)", async () => {
    const body = await storage().read(key);
    const hash = createHash("sha256");
    for await (const chunk of body ?? []) hash.update(chunk);
    expect(hash.digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it("presigned GET serves the verified type and disposition", async () => {
    const url = await storage().presignGet(key, {
      expiresInSeconds: 60,
      contentType: "application/pdf",
      disposition: "attachment",
      filename: 'invoice "q".pdf',
    });
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(new Uint8Array(await res.arrayBuffer()).byteLength).toBe(bytes.byteLength);
  });

  it("expired presigned URLs are refused", async () => {
    const url = await storage().presignGet(key, {
      expiresInSeconds: 1,
      contentType: "application/pdf",
      disposition: "attachment",
      filename: "x.pdf",
    });
    await sleep(2500);
    expect((await fetch(url)).status).toBe(403);
  }, 15_000);

  it.skipIf(EMULATOR)(
    "the bucket is private: anonymous object read and listing are denied",
    async () => {
      expect([401, 403]).toContain((await fetch(objectUrl(key))).status);
      const listUrl = objectUrl("").replace(/\/$/, "") + "?list-type=2";
      expect([401, 403]).toContain((await fetch(listUrl)).status);
    },
  );

  it.skipIf(!ORIGIN)("CORS allows the web origin for PUT/GET and nothing else", async () => {
    const up = await storage().presignPut(attachmentStorageKey(randomUUID(), randomUUID()), {
      contentType: "application/pdf",
      expiresInSeconds: 60,
    });
    const preflight = (origin: string) =>
      fetch(up.url, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type",
        },
      });
    const allowed = await preflight(ORIGIN as string);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const denied = await preflight("https://evil.example");
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.skipIf(EMULATOR || process.env.CHAT_PROVIDER_TEST_EXPECT_PREFIX_SCOPE !== "1")(
    "API credentials cannot write outside the chat/ prefix (IAM scope)",
    async () => {
      const outside = await storage().presignPut(`not-chat/${randomUUID()}`, {
        contentType: "application/pdf",
        expiresInSeconds: 60,
      });
      const res = await fetch(outside.url, {
        method: "PUT",
        headers: outside.headers,
        body: bytes,
      });
      expect(res.status).toBe(403);
    },
  );

  it("listing is bounded to the prefix; deletion is idempotent and removes the object", async () => {
    const page = await storage().list("chat/", { maxKeys: 1000 });
    expect(page.objects.every((o) => o.key.startsWith("chat/"))).toBe(true);
    expect(page.objects.some((o) => o.key === key)).toBe(true);
    await storage().delete(key);
    await storage().delete(key);
    expect(await storage().head(key)).toBeNull();
    expect(await storage().read(key)).toBeNull();
  });
});
