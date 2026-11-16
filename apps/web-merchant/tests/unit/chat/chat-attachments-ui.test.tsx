import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Provider } from "react-redux";
import {
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatMessageType,
  type ChatAttachmentItem,
  type ChatAttachmentUploadTicket,
  type CreateChatAttachmentRequest,
} from "@dhruto/contracts";
import messages from "../../../messages/en.json";
import { makeStore } from "@/store";
import { historyLoaded, messageReceived, optimisticAdded } from "../../../features/chat/state/chat-timeline.slice";
import { CONV, ME, page, serverMessage } from "./chat-fixtures";

/* ------------------------------------------------------------------ */
/* Network boundary mocks (API hooks + XHR); everything else is real.  */
/* ------------------------------------------------------------------ */

const calls = {
  reserve: [] as Array<{ conversationId: string; body: CreateChatAttachmentRequest }>,
  complete: [] as string[],
  cancel: [] as string[],
  download: [] as string[],
};
let completeResult: () => Promise<ChatAttachmentItem>;
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));

function item(overrides: Partial<ChatAttachmentItem> = {}): ChatAttachmentItem {
  return {
    id: "att-1",
    originalFilename: "photo.png",
    mimeType: "image/png",
    kind: "image",
    sizeBytes: 8,
    status: ChatAttachmentStatus.UPLOADED,
    uploadedAt: "2026-11-16T10:00:00.000Z",
    // Phase 7: rendering tests use scanned files; the gate has its own tests.
    scanStatus: ChatAttachmentScanStatus.CLEAN,
    ...overrides,
  };
}

vi.mock("../../../features/chat/api/chat.api", async (importActual) => {
  const actual = await importActual<typeof import("../../../features/chat/api/chat.api")>();
  return {
    ...actual,
    useReserveAttachmentMutation: () => [
      (args: { conversationId: string; body: CreateChatAttachmentRequest }) => {
        calls.reserve.push(args);
        const n = calls.reserve.length; // ids restart at att-1 in every test
        const ticket: ChatAttachmentUploadTicket = {
          attachment: item({ id: `att-${n}`, originalFilename: args.body.originalFilename, status: ChatAttachmentStatus.PENDING }),
          upload: { method: "PUT", url: `https://storage.test/put-${n}`, headers: { "Content-Type": args.body.mimeType }, expiresAt: "2099-01-01T00:00:00Z" },
        };
        return { unwrap: async () => ticket };
      },
    ],
    useCompleteAttachmentMutation: () => [
      (id: string) => {
        calls.complete.push(id);
        return { unwrap: () => completeResult() };
      },
    ],
    useCancelAttachmentMutation: () => [
      (id: string) => {
        calls.cancel.push(id);
        return { unwrap: async () => ({ id, deleted: true }) };
      },
    ],
    useGetAttachmentDownloadQuery: (id: string) => ({
      data: { url: `https://storage.test/get/${id}`, expiresAt: "2099-01-01T00:00:00Z", disposition: "inline" },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
    useLazyGetAttachmentFileQuery: () => [
      (id: string) => {
        calls.download.push(id);
        return { unwrap: async () => ({ url: `https://storage.test/dl/${id}`, expiresAt: "2099-01-01T00:00:00Z", disposition: "attachment" }) };
      },
      { isFetching: false },
    ],
  };
});

/** Minimal XHR double: records PUTs; tests drive progress/success/failure. */
class FakeXHR {
  static instances: FakeXHR[] = [];
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  aborted = false;
  constructor() {
    FakeXHR.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  succeed() {
    this.status = 200;
    this.onload?.();
  }
  fail() {
    this.onerror?.();
  }
}

import { useAttachmentUploads } from "../../../features/chat/hooks/use-attachment-uploads";
import { MessageComposer } from "../../../features/chat/components/message-composer";
import { MessageAttachments } from "../../../features/chat/components/message-attachments";
import { VoiceRecorderBar } from "../../../features/chat/components/voice-recorder-bar";
import { baseMimeType, checkFile, formatBytes, sha256Hex } from "../../../features/chat/lib/upload";
import { buildSendRequest, mediaTypeFor } from "../../../features/chat/hooks/use-send-message";

// jsdom's Blob lacks arrayBuffer() (all supported browsers have it); polyfill via FileReader.
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => (reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("read")));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngFile = (name = "photo.png") => new File([PNG_BYTES], name, { type: "image/png" });

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
        {children}
      </NextIntlClientProvider>
    </Provider>
  );
}

beforeEach(() => {
  calls.reserve.length = 0;
  calls.complete.length = 0;
  calls.cancel.length = 0;
  calls.download.length = 0;
  FakeXHR.instances = [];
  toastError.mockReset();
  completeResult = async () => item({ id: calls.complete[calls.complete.length - 1] });
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
});
afterEach(() => vi.unstubAllGlobals());

async function flush() {
  await act(async () => {
    // Hashing goes through FileReader (macrotasks) before reserve/PUT.
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/* ------------------------------------------------------------------ */

describe("upload helpers", () => {
  it("validates with the shared policy and normalizes MIME parameters", () => {
    expect(checkFile({ name: "a.png", type: "image/png", size: 10 })).toEqual({ ok: true, mimeType: "image/png" });
    expect(checkFile({ name: "a.svg", type: "image/svg+xml", size: 10 })).toEqual({ ok: false, violation: "type" });
    expect(checkFile({ name: "a.pdf", type: "image/png", size: 10 })).toEqual({ ok: false, violation: "extension" });
    expect(checkFile({ name: "a.pdf", type: "application/pdf", size: 21 * 1024 * 1024 })).toEqual({ ok: false, violation: "size" });
    expect(baseMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(formatBytes(1536, "en")).toBe("1.5 KB");
  });

  it("hashes with SHA-256 (what the server re-measures)", async () => {
    expect(await sha256Hex(new Blob([new TextEncoder().encode("abc")]))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("builds media send requests that are identical on retry", () => {
    const images = [item(), item({ id: "att-2" })];
    expect(mediaTypeFor(images)).toBe(ChatMessageType.IMAGE);
    expect(mediaTypeFor([item(), item({ id: "d", kind: "document", mimeType: "application/pdf" })])).toBe(ChatMessageType.FILE);
    const entry = { content: "Package photo", replyToMessageId: null, type: ChatMessageType.IMAGE, attachments: images };
    expect(buildSendRequest("cm-1", entry)).toEqual({
      type: ChatMessageType.IMAGE,
      clientMessageId: "cm-1",
      attachmentIds: ["att-1", "att-2"],
      content: "Package photo",
    });
    expect(buildSendRequest("cm-1", entry)).toEqual(buildSendRequest("cm-1", entry));
    expect(
      buildSendRequest("cm-2", {
        content: "",
        replyToMessageId: "m-1",
        type: ChatMessageType.VOICE,
        attachments: [item({ id: "v", kind: "audio", mimeType: "audio/webm" })],
        metadata: { durationMs: 3000 },
      }),
    ).toEqual({ type: ChatMessageType.VOICE, clientMessageId: "cm-2", attachmentIds: ["v"], metadata: { durationMs: 3000 }, replyToMessageId: "m-1" });
    expect(buildSendRequest("cm-3", { content: "hi", replyToMessageId: null })).toEqual({
      type: ChatMessageType.TEXT,
      clientMessageId: "cm-3",
      content: "hi",
    });
  });
});

describe("useAttachmentUploads", () => {
  it("hash → reserve → direct PUT with progress → server completion → ready", async () => {
    const { result } = renderHook(() => useAttachmentUploads(CONV), { wrapper });
    act(() => {
      result.current.add([pngFile()]);
    });
    await flush();
    expect(calls.reserve).toHaveLength(1);
    expect(calls.reserve[0]).toEqual({
      conversationId: CONV,
      body: {
        originalFilename: "photo.png",
        mimeType: "image/png",
        sizeBytes: PNG_BYTES.byteLength,
        checksumSha256: await sha256Hex(new Blob([PNG_BYTES])),
      },
    });
    const xhr = FakeXHR.instances[0]!;
    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("https://storage.test/put-1");
    expect(xhr.headers).toEqual({ "Content-Type": "image/png" });
    expect(result.current.busy).toBe(true);
    act(() => xhr.progress(4, 8));
    expect(result.current.drafts[0]).toMatchObject({ status: "uploading", progress: 0.5 });
    act(() => xhr.succeed());
    await flush();
    expect(calls.complete).toEqual(["att-1"]);
    expect(result.current.drafts[0]?.status).toBe("ready");
    expect(result.current.ready.map((a) => a.id)).toEqual(["att-1"]);
    expect(result.current.busy).toBe(false);
  });

  it("rejects invalid files on the client without contacting the server", () => {
    const { result } = renderHook(() => useAttachmentUploads(CONV), { wrapper });
    let outcome: ReturnType<typeof result.current.add> | undefined;
    act(() => {
      outcome = result.current.add([
        new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
        new File(["x"], "notes.png", { type: "application/pdf" }),
      ]);
    });
    expect(outcome?.added).toBe(0);
    expect(outcome?.rejected.map((r) => r.violation)).toEqual(["type", "extension"]);
    expect(calls.reserve).toHaveLength(0);
  });

  it("a failed transfer can be retried with a fresh reservation (old one cancelled)", async () => {
    const { result } = renderHook(() => useAttachmentUploads(CONV), { wrapper });
    act(() => {
      result.current.add([pngFile()]);
    });
    await flush();
    act(() => FakeXHR.instances[0]!.fail());
    await flush();
    expect(result.current.drafts[0]).toMatchObject({ status: "failed", error: "uploadFailed" });
    expect(result.current.hasFailed).toBe(true);
    act(() => result.current.retry(result.current.drafts[0]!.localId));
    await flush();
    expect(calls.cancel).toEqual(["att-1"]);
    expect(calls.reserve).toHaveLength(2);
    act(() => FakeXHR.instances[1]!.succeed());
    await flush();
    expect(result.current.drafts[0]?.status).toBe("ready");
  });

  it("server-side rejection is shown as failed with the localized reason", async () => {
    completeResult = () => Promise.reject({ status: 422, data: { errorCode: "CHAT_ATTACHMENT_INVALID" } });
    const { result } = renderHook(() => useAttachmentUploads(CONV), { wrapper });
    act(() => {
      result.current.add([pngFile()]);
    });
    await flush();
    act(() => FakeXHR.instances[0]!.succeed());
    await flush();
    expect(result.current.drafts[0]).toMatchObject({ status: "failed", error: "attachmentInvalid" });
  });

  it("removing a draft aborts the transfer and cancels the server attachment", async () => {
    const { result } = renderHook(() => useAttachmentUploads(CONV), { wrapper });
    act(() => {
      result.current.add([pngFile()]);
    });
    await flush();
    act(() => result.current.remove(result.current.drafts[0]!.localId));
    await flush();
    expect(FakeXHR.instances[0]!.aborted).toBe(true);
    expect(calls.cancel).toEqual(["att-1"]);
    expect(result.current.drafts).toEqual([]);
  });
});

describe("composer with attachments", () => {
  it("blocks sending during upload, then sends an IMAGE message with the verified attachment", async () => {
    const onSend = vi.fn();
    render(
      <MessageComposer
        conversationId={CONV}
        resetKey={CONV}
        disabledReason={null}
        reply={null}
        onCancelReply={vi.fn()}
        onSend={onSend}
        onTyping={vi.fn()}
        onStopTyping={vi.fn()}
      />,
      { wrapper },
    );
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await flush();
    expect(screen.getByText("photo.png")).toBeTruthy();
    const sendButton = () => screen.getByRole("button", { name: messages.Chat.send }) as HTMLButtonElement;
    expect(sendButton().disabled).toBe(true);
    act(() => FakeXHR.instances[0]!.succeed());
    await flush();
    expect(sendButton().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText(messages.Chat.composerLabel), { target: { value: "Package photo" } });
    fireEvent.click(sendButton());
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith("Package photo", null, {
        type: ChatMessageType.IMAGE,
        attachments: [expect.objectContaining({ id: "att-1", status: "UPLOADED" })],
      }),
    );
    expect(screen.queryByText("photo.png")).toBeNull();
    expect(calls.cancel).toEqual([]); // sent attachments are never cancelled
  });

  it("shows a validation message for unsupported files", async () => {
    render(
      <MessageComposer
        conversationId={CONV}
        resetKey={CONV}
        disabledReason={null}
        reply={null}
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        onTyping={vi.fn()}
        onStopTyping={vi.fn()}
      />,
      { wrapper },
    );
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["x"], "run.exe", { type: "application/x-msdownload" })] } });
    expect(toastError).toHaveBeenCalledWith("run.exe: this file type isn't supported");
  });
});

describe("attachment rendering", () => {
  it("images load via authorized URLs and open in a preview", () => {
    render(<MessageAttachments attachments={[item()]} />, { wrapper });
    const img = screen.getByAltText("photo.png") as HTMLImageElement;
    expect(img.src).toBe("https://storage.test/get/att-1");
    expect(img.getAttribute("loading")).toBe("lazy");
    fireEvent.click(screen.getByRole("button", { name: "Open image photo.png" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("documents show name, type and size and download through a fresh authorized URL", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(
      <MessageAttachments
        attachments={[item({ id: "doc-1", kind: "document", mimeType: "application/pdf", originalFilename: "<b>invoice</b>.pdf", sizeBytes: 2048 })]}
      />,
      { wrapper },
    );
    expect(screen.getByText("<b>invoice</b>.pdf")).toBeTruthy();
    expect(screen.getByText("PDF · 2 KB")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Download <b>invoice</b>.pdf" }));
    await waitFor(() => expect(calls.download).toEqual(["doc-1"]));
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });

  it("voice messages render an audio player with the duration", () => {
    const { container } = render(
      <MessageAttachments attachments={[item({ id: "v-1", kind: "audio", mimeType: "audio/webm", originalFilename: "voice.webm" })]} durationMs={65000} />,
      { wrapper },
    );
    const audio = container.querySelector("audio")!;
    expect(audio.getAttribute("src")).toBe("https://storage.test/get/v-1");
    expect(audio.getAttribute("preload")).toBe("none");
    expect(screen.getByText("1:05")).toBeTruthy();
  });
});

describe("voice recorder", () => {
  it("never requests the microphone before the user presses record; unsupported browsers get a clear message", async () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
    vi.stubGlobal("MediaRecorder", undefined);
    render(<VoiceRecorderBar conversationId={CONV} onSend={vi.fn()} onActiveChange={vi.fn()} />, { wrapper });
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.voice.record }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(messages.Chat.voice.unsupported);
  });

  it("permission denial is reported and nothing is recorded", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
    vi.stubGlobal("MediaRecorder", class { static isTypeSupported() { return true; } });
    render(<VoiceRecorderBar conversationId={CONV} onSend={vi.fn()} onActiveChange={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.voice.record }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(messages.Chat.voice.denied));
  });

  it("records, uploads and sends a VOICE message; the microphone is released", async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    class FakeRecorder {
      static isTypeSupported(type: string) {
        return type.startsWith("audio/webm");
      }
      state: "inactive" | "recording" = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1])], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    completeResult = async () => item({ id: "att-1", kind: "audio", mimeType: "audio/webm", originalFilename: "voice.webm" });
    const onSend = vi.fn();
    const onActiveChange = vi.fn();
    render(<VoiceRecorderBar conversationId={CONV} onSend={onSend} onActiveChange={onActiveChange} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.voice.record }));
    const stop = await screen.findByRole("button", { name: messages.Chat.voice.stopAndSend });
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(stop);
    await flush();
    expect(stopTrack).toHaveBeenCalled();
    expect(calls.reserve[0]?.body.mimeType).toBe("audio/webm");
    expect(calls.reserve[0]?.body.originalFilename).toMatch(/^voice-.*\.webm$/);
    act(() => FakeXHR.instances[0]!.succeed());
    await flush();
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        type: ChatMessageType.VOICE,
        attachments: [expect.objectContaining({ kind: "audio" })],
        metadata: { durationMs: expect.any(Number) },
      }),
    );
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});

describe("timeline deduplication with attachments", () => {
  it("the optimistic media bubble and its canonical/realtime copies merge into one entry", () => {
    const store = makeStore();
    store.dispatch(historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "1" })]), direction: "latest" }));
    const attachment = item();
    store.dispatch(
      optimisticAdded({
        conversationId: CONV,
        clientMessageId: "cm-media",
        senderId: ME,
        content: "",
        replyToMessageId: null,
        createdAt: new Date().toISOString(),
        type: ChatMessageType.IMAGE,
        attachments: [attachment],
      }),
    );
    const timeline = () => store.getState().chatTimeline.conversations[CONV]!;
    expect(timeline().messages["cm-media"]).toMatchObject({ type: ChatMessageType.IMAGE, content: null, attachments: [attachment] });
    expect(timeline().outbox["cm-media"]).toEqual({ content: "", replyToMessageId: null, type: ChatMessageType.IMAGE, attachments: [attachment] });
    const canonical = serverMessage({ sequence: "2", clientMessageId: "cm-media", senderId: ME, type: ChatMessageType.IMAGE, content: null, attachments: [attachment] });
    store.dispatch(messageReceived({ message: canonical }));
    store.dispatch(messageReceived({ message: canonical, eventId: "evt-dup" }));
    expect(timeline().order.filter((key) => key === "cm-media")).toHaveLength(1);
    expect(timeline().messages["cm-media"]?.attachments).toHaveLength(1);
    expect(timeline().outbox["cm-media"]).toBeUndefined();
  });
});
