import {
  checkChatUploadPolicy,
  isChatAttachmentMimeType,
  type ChatAttachmentMimeType,
  type ChatUploadPolicyViolation,
} from "@dhruto/contracts";

/** Strips parameters: "audio/webm;codecs=opus" → "audio/webm". */
export function baseMimeType(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

export type FileCheck =
  | { ok: true; mimeType: ChatAttachmentMimeType }
  | { ok: false; violation: ChatUploadPolicyViolation };

/**
 * Client-side policy check (UX only — the server re-checks the declaration
 * and then verifies the actual bytes). Uses the same shared policy.
 */
export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  const mimeType = baseMimeType(file.type);
  if (!isChatAttachmentMimeType(mimeType)) return { ok: false, violation: "type" };
  const violation = checkChatUploadPolicy({ originalFilename: file.name, mimeType, sizeBytes: file.size });
  return violation ? { ok: false, violation } : { ok: true, mimeType };
}

/** Lowercase hex SHA-256 (the server compares it with what it measures). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload aborted");
    this.name = "UploadAbortedError";
  }
}

/**
 * PUTs the file to the presigned URL with progress (XHR: fetch has no upload
 * progress). The URL is used once and never stored or logged. Resolves on
 * 2xx, rejects otherwise; `signal` aborts the transfer.
 */
export function putWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadAbortedError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed (network)"));
    xhr.onabort = () => reject(new UploadAbortedError());
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

/** "1.2 MB" style size for file cards (locale-aware digits). */
export function formatBytes(bytes: number, locale: string): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}
