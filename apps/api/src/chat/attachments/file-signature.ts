import { type ChatAttachmentMimeType } from "@dhruto/contracts";

/** Bytes inspected for signatures (largest check needs 12). */
export const SIGNATURE_BYTES = 16;

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

/**
 * Magic-byte verification (Phase 6). Returns true only when the file's first
 * bytes match the DECLARED type, so content that merely claims to be an
 * image/PDF/audio (HTML, SVG, scripts, executables, polyglots starting with
 * other markers) is rejected regardless of extension or Content-Type.
 */
export function matchesSignature(mimeType: ChatAttachmentMimeType, head: Uint8Array): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8);
    case "application/pdf":
      return startsWith(head, ascii("%PDF-"));
    case "audio/webm":
      // EBML header (Matroska/WebM container).
      return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);
    case "audio/ogg":
      return startsWith(head, ascii("OggS"));
    case "audio/mpeg":
      // ID3v2 tag, or an MPEG audio frame sync (11 set bits).
      return (
        startsWith(head, ascii("ID3")) ||
        (head.length >= 2 && head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0)
      );
    case "audio/mp4":
      // ISO BMFF: "ftyp" box at offset 4.
      return startsWith(head, ascii("ftyp"), 4);
  }
}
