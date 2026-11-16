import { describe, it, expect } from "vitest";
import {
  CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_UPLOAD_POLICY,
  chatAttachmentKind,
  chatFileExtension,
  checkChatUploadPolicy,
  createChatAttachmentSchema,
} from "../index.js";

const base = {
  originalFilename: "receipt.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  checksumSha256: "b".repeat(64),
};

describe("chat upload policy (Phase 6)", () => {
  it("covers every allowed MIME type with limits within the global ceiling", () => {
    for (const mime of CHAT_ALLOWED_ATTACHMENT_MIME_TYPES) {
      const entry = CHAT_UPLOAD_POLICY[mime];
      expect(entry.extensions.length).toBeGreaterThan(0);
      expect(entry.maxBytes).toBeLessThanOrEqual(CHAT_ATTACHMENT_MAX_SIZE_BYTES);
    }
  });

  it("requires the extension to match the declared type", () => {
    expect(checkChatUploadPolicy(base)).toBeNull();
    expect(checkChatUploadPolicy({ ...base, originalFilename: "invoice.PDF" })).toBeNull();
    expect(checkChatUploadPolicy({ ...base, originalFilename: "evil.html" })).toBe("extension");
    expect(checkChatUploadPolicy({ ...base, originalFilename: "noextension" })).toBe("extension");
    expect(checkChatUploadPolicy({ ...base, originalFilename: "photo.jpg" })).toBe("extension");
  });

  it("enforces per-type size limits and rejects unknown types", () => {
    expect(checkChatUploadPolicy({ ...base, sizeBytes: CHAT_UPLOAD_POLICY["application/pdf"].maxBytes })).toBeNull();
    expect(checkChatUploadPolicy({ ...base, sizeBytes: CHAT_UPLOAD_POLICY["application/pdf"].maxBytes + 1 })).toBe("size");
    expect(
      checkChatUploadPolicy({ originalFilename: "a.png", mimeType: "image/png", sizeBytes: 10 * 1024 * 1024 + 1 }),
    ).toBe("size");
    expect(checkChatUploadPolicy({ ...base, mimeType: "image/svg+xml", originalFilename: "a.svg" })).toBe("type");
  });

  it("the reservation schema applies the policy", () => {
    expect(createChatAttachmentSchema.safeParse(base).success).toBe(true);
    const badExt = createChatAttachmentSchema.safeParse({ ...base, originalFilename: "x.exe" });
    expect(badExt.success).toBe(false);
    const tooBig = createChatAttachmentSchema.safeParse({
      ...base,
      originalFilename: "voice.webm",
      mimeType: "audio/webm",
      sizeBytes: 11 * 1024 * 1024,
    });
    expect(tooBig.success).toBe(false);
    expect(createChatAttachmentSchema.safeParse({ ...base, originalFilename: "../../etc/passwd.pdf" }).success).toBe(false);
  });

  it("derives presentation kinds and extensions", () => {
    expect(chatAttachmentKind("image/webp")).toBe("image");
    expect(chatAttachmentKind("audio/mp4")).toBe("audio");
    expect(chatAttachmentKind("application/pdf")).toBe("document");
    expect(chatFileExtension("archive.tar.GZ")).toBe("gz");
    expect(chatFileExtension(".hidden")).toBe("");
  });
});
