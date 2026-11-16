"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_VOICE_MAX_DURATION_MS } from "@dhruto/contracts";
import { baseMimeType } from "../lib/upload";

export type RecorderState = "idle" | "requesting" | "recording" | "unsupported" | "denied" | "error";

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  filename: string;
}

/** Container formats in preference order; all are on the server allow-list. */
const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"] as const;
const EXTENSION: Readonly<Record<string, string>> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

export function voiceRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function pickMimeType(): string | null {
  for (const candidate of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

/**
 * Voice recording (Phase 6). The microphone is requested ONLY when the user
 * explicitly starts a recording, tracks are released on stop/cancel/unmount,
 * and recordings stop automatically at CHAT_VOICE_MAX_DURATION_MS.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStop = useRef<((recording: Recording | null) => void) | null>(null);

  const release = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => () => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    release();
  }, [release]);

  const stop = useCallback((): Promise<Recording | null> => {
    const active = recorder.current;
    if (!active || active.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveStop.current = resolve;
      active.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (!voiceRecordingSupported()) {
      setState("unsupported");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setState(denied ? "denied" : "error");
      release();
      return;
    }
    chunks.current = [];
    const instance = new MediaRecorder(stream.current, { mimeType });
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    instance.onstop = () => {
      const durationMs = Math.max(1, Math.min(Date.now() - startedAt.current, CHAT_VOICE_MAX_DURATION_MS));
      const type = baseMimeType(instance.mimeType || mimeType);
      const blob = new Blob(chunks.current, { type });
      const recording: Recording = {
        blob,
        mimeType: type,
        durationMs,
        filename: `voice-${new Date().toISOString().replace(/[:.]/g, "-")}.${EXTENSION[type] ?? "webm"}`,
      };
      release();
      setState("idle");
      setElapsedMs(0);
      resolveStop.current?.(blob.size > 0 ? recording : null);
      resolveStop.current = null;
    };
    recorder.current = instance;
    startedAt.current = Date.now();
    setElapsedMs(0);
    instance.start(250);
    setState("recording");
    tick.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      setElapsedMs(elapsed);
      if (elapsed >= CHAT_VOICE_MAX_DURATION_MS && recorder.current?.state === "recording") recorder.current.stop();
    }, 250);
  }, [release]);

  /** Discards the recording and releases the microphone. */
  const cancel = useCallback(() => {
    const active = recorder.current;
    resolveStop.current = null;
    if (active && active.state !== "inactive") {
      active.onstop = null;
      active.stop();
    }
    release();
    setState("idle");
    setElapsedMs(0);
  }, [release]);

  /** Clears a terminal error state (unsupported/denied/error) after it was shown. */
  const reset = useCallback(() => setState("idle"), []);

  return { state, elapsedMs, start, stop, cancel, reset };
}
