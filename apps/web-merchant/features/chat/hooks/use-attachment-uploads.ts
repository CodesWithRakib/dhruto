"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  type ChatAttachmentItem,
  type ChatAttachmentMimeType,
  type ChatUploadPolicyViolation,
} from "@dhruto/contracts";
import {
  useCancelAttachmentMutation,
  useCompleteAttachmentMutation,
  useReserveAttachmentMutation,
} from "../api/chat.api";
import { chatErrorKey, type ChatErrorKey } from "../lib/errors";
import { UploadAbortedError, checkFile, putWithProgress, sha256Hex } from "../lib/upload";

export type DraftStatus = "preparing" | "uploading" | "verifying" | "ready" | "failed";

export interface AttachmentDraft {
  localId: string;
  name: string;
  mimeType: ChatAttachmentMimeType;
  size: number;
  status: DraftStatus;
  /** 0..1 while uploading. */
  progress: number;
  /** Server attachment once reserved (status UPLOADED when `ready`). */
  attachment: ChatAttachmentItem | null;
  error: ChatErrorKey | "uploadFailed" | null;
}

export type AddResult = { added: number; rejected: Array<{ name: string; violation: ChatUploadPolicyViolation | "tooMany" }> };

interface DraftRuntime {
  file: Blob;
  name: string;
  controller: AbortController | null;
}

/**
 * Composer attachment state (Phase 6) — local to the composer, separate
 * from the realtime/ephemeral slices. Each file goes through
 * hash → reserve (server policy + membership) → direct PUT (progress, abort)
 * → complete (server verifies bytes). Removing a draft aborts the transfer
 * and cancels the server reservation so nothing is left behind (the
 * server-side cleanup job is the backstop).
 */
export function useAttachmentUploads(conversationId: string) {
  const [drafts, setDrafts] = useState<AttachmentDraft[]>([]);
  const runtime = useRef(new Map<string, DraftRuntime>());
  const [reserve] = useReserveAttachmentMutation();
  const [complete] = useCompleteAttachmentMutation();
  const [cancelOnServer] = useCancelAttachmentMutation();

  const patch = useCallback((localId: string, changes: Partial<AttachmentDraft>) => {
    setDrafts((current) => current.map((d) => (d.localId === localId ? { ...d, ...changes } : d)));
  }, []);

  const run = useCallback(
    async (localId: string, mimeType: ChatAttachmentMimeType, existing: ChatAttachmentItem | null) => {
      const entry = runtime.current.get(localId);
      if (!entry) return;
      const controller = new AbortController();
      entry.controller = controller;
      patch(localId, { status: "preparing", progress: 0, error: null });
      try {
        let attachment = existing;
        if (!attachment || attachment.status !== "UPLOADED") {
          // A retry reserves a fresh slot (old presigned URLs may have expired);
          // the abandoned reservation is cancelled best-effort.
          if (attachment) void cancelOnServer(attachment.id);
          const checksumSha256 = await sha256Hex(entry.file);
          if (controller.signal.aborted) throw new UploadAbortedError();
          const ticket = await reserve({
            conversationId,
            body: { originalFilename: entry.name, mimeType, sizeBytes: entry.file.size, checksumSha256 },
          }).unwrap();
          attachment = ticket.attachment;
          patch(localId, { attachment, status: "uploading" });
          await putWithProgress(
            ticket.upload.url,
            ticket.upload.headers,
            entry.file,
            (progress) => patch(localId, { progress }),
            controller.signal,
          );
          patch(localId, { status: "verifying", progress: 1 });
          attachment = await complete(attachment.id).unwrap();
        }
        patch(localId, { status: "ready", attachment, progress: 1 });
      } catch (error) {
        if (error instanceof UploadAbortedError) return;
        const isHttp = typeof error === "object" && error !== null && "status" in error;
        patch(localId, { status: "failed", error: isHttp ? chatErrorKey(error) : "uploadFailed" });
      } finally {
        if (runtime.current.get(localId) === entry) entry.controller = null;
      }
    },
    [cancelOnServer, complete, conversationId, patch, reserve],
  );

  /** Validates and starts uploads; returns what was rejected client-side. */
  const add = useCallback(
    (files: ReadonlyArray<File | { blob: Blob; name: string }>): AddResult => {
      const result: AddResult = { added: 0, rejected: [] };
      const room = CHAT_MAX_ATTACHMENTS_PER_MESSAGE - runtime.current.size;
      const accepted: AttachmentDraft[] = [];
      for (const item of files) {
        const blob = item instanceof File ? item : item.blob;
        const name = item.name;
        if (accepted.length >= room) {
          result.rejected.push({ name, violation: "tooMany" });
          continue;
        }
        const check = checkFile({ name, type: blob.type, size: blob.size });
        if (!check.ok) {
          result.rejected.push({ name, violation: check.violation });
          continue;
        }
        const localId = crypto.randomUUID();
        runtime.current.set(localId, { file: blob, name, controller: null });
        accepted.push({
          localId,
          name,
          mimeType: check.mimeType,
          size: blob.size,
          status: "preparing",
          progress: 0,
          attachment: null,
          error: null,
        });
      }
      if (accepted.length > 0) {
        setDrafts((current) => [...current, ...accepted]);
        for (const draft of accepted) void run(draft.localId, draft.mimeType, null);
      }
      result.added = accepted.length;
      return result;
    },
    [run],
  );

  const retry = useCallback(
    (localId: string) => {
      const draft = drafts.find((d) => d.localId === localId);
      if (draft && draft.status === "failed") void run(localId, draft.mimeType, draft.attachment);
    },
    [drafts, run],
  );

  /** Removes a draft: aborts the transfer and cancels the server attachment (never sent). */
  const remove = useCallback(
    (localId: string) => {
      const entry = runtime.current.get(localId);
      entry?.controller?.abort();
      runtime.current.delete(localId);
      setDrafts((current) => {
        const draft = current.find((d) => d.localId === localId);
        if (draft?.attachment) void cancelOnServer(draft.attachment.id);
        return current.filter((d) => d.localId !== localId);
      });
    },
    [cancelOnServer],
  );

  /** After a successful send: forget drafts WITHOUT cancelling (they now belong to the message). */
  const clearSent = useCallback(() => {
    runtime.current.clear();
    setDrafts([]);
  }, []);

  // Leaving the conversation aborts in-flight transfers; unsent server
  // reservations expire and are removed by the server cleanup job.
  useEffect(() => {
    const entries = runtime.current;
    return () => {
      for (const entry of entries.values()) entry.controller?.abort();
      entries.clear();
    };
  }, [conversationId]);

  const busy = drafts.some((d) => d.status === "preparing" || d.status === "uploading" || d.status === "verifying");
  const ready = drafts.flatMap((d) => (d.status === "ready" && d.attachment ? [d.attachment] : []));
  const hasFailed = drafts.some((d) => d.status === "failed");

  return { drafts, add, retry, remove, clearSent, busy, ready, hasFailed };
}
