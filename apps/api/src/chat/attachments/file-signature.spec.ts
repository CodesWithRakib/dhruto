import { describe, it, expect } from "vitest";
import { CHAT_ALLOWED_ATTACHMENT_MIME_TYPES, type ChatAttachmentMimeType } from "@dhruto/contracts";
import { matchesSignature } from "./file-signature.js";
import { contentDisposition } from "./s3-object-storage.js";
import { attachmentStorageKey } from "./attachment.config.js";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

const SAMPLES: Record<ChatAttachmentMimeType, Uint8Array> = {
  "image/jpeg": bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10),
  "image/png": bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d),
  "image/webp": concat(text("RIFF"), bytes(0x24, 0, 0, 0), text("WEBPVP8 ")),
  "application/pdf": text("%PDF-1.7\n%"),
  "audio/webm": bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86),
  "audio/ogg": text("OggS\0\x02"),
  "audio/mpeg": concat(text("ID3"), bytes(4, 0, 0)),
  "audio/mp4": concat(bytes(0, 0, 0, 0x20), text("ftypM4A ")),
};

describe("file signature verification", () => {
  it("accepts every allowed type's genuine signature", () => {
    for (const mime of CHAT_ALLOWED_ATTACHMENT_MIME_TYPES) {
      expect(matchesSignature(mime, SAMPLES[mime]), mime).toBe(true);
    }
  });

  it("rejects content masquerading as another type", () => {
    const html = text("<!doctype html><script>alert(1)</script>");
    const svg = text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    const exe = text("MZ\x90\0\x03");
    for (const mime of CHAT_ALLOWED_ATTACHMENT_MIME_TYPES) {
      for (const fake of [html, svg, exe]) expect(matchesSignature(mime, fake), mime).toBe(false);
    }
    expect(matchesSignature("image/png", SAMPLES["image/jpeg"])).toBe(false);
    expect(matchesSignature("application/pdf", SAMPLES["image/png"])).toBe(false);
    expect(
      matchesSignature("image/webp", concat(text("RIFF"), bytes(0, 0, 0, 0), text("WAVEfmt "))),
    ).toBe(false);
  });

  it("rejects empty and truncated input", () => {
    expect(matchesSignature("image/png", new Uint8Array())).toBe(false);
    expect(matchesSignature("image/png", bytes(0x89, 0x50))).toBe(false);
    expect(matchesSignature("audio/mp4", bytes(0, 0, 0))).toBe(false);
  });

  it("MPEG frame sync is recognized without an ID3 tag", () => {
    expect(matchesSignature("audio/mpeg", bytes(0xff, 0xfb, 0x90, 0x64))).toBe(true);
    expect(matchesSignature("audio/mpeg", bytes(0xff, 0x0b))).toBe(false);
  });
});

describe("download headers and keys", () => {
  it("Content-Disposition neutralizes quotes, control chars and non-ASCII safely", () => {
    expect(contentDisposition("attachment", 'in"voice\\.pdf')).toBe(
      `attachment; filename="in_voice_.pdf"; filename*=UTF-8''in%22voice%5C.pdf`,
    );
    expect(contentDisposition("inline", "রসিদ.pdf")).toBe(
      `inline; filename="____.pdf"; filename*=UTF-8''${encodeURIComponent("রসিদ.pdf")}`,
    );
  });

  it("storage keys are server-generated and never contain user input", () => {
    expect(attachmentStorageKey("c-1", "a-1")).toBe("chat/c-1/a-1");
  });
});
