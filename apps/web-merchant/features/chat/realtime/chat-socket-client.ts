import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import {
  CHAT_SOCKET_NAMESPACE,
  ChatClientEvent,
  ChatServerEvent,
  ChatSocketErrorCode,
  type ChatConversationCreatedEvent,
  type ChatConversationUpdatedEvent,
  type ChatCursorState,
  type ChatCursorUpdatedEvent,
  type ChatMembershipRevokedEvent,
  type ChatMessageDeletedEvent,
  type ChatMessageEvent,
  type ChatParticipantUpdatedEvent,
  type ChatPinUpdatedEvent,
  type ChatPresenceEntry,
  type ChatPresenceEvent,
  type ChatReactionUpdatedEvent,
  type ChatSessionReady,
  type ChatSocketAck,
  type ChatSocketError,
  type ChatSocketJoinResult,
  type ChatTypingEvent,
} from "@dhruto/contracts";
import { type ChatConnectionState } from "../state/chat-ephemeral.slice";

/** Server -> client payloads (PHASE-3-REALTIME-PROTOCOL.md §5). */
export interface ChatServerEventMap {
  [ChatServerEvent.SESSION_READY]: ChatSessionReady;
  [ChatServerEvent.SESSION_ERROR]: ChatSocketError;
  [ChatServerEvent.SESSION_EXPIRED]: { expiresAt: string };
  [ChatServerEvent.CONVERSATION_CREATED]: ChatConversationCreatedEvent;
  [ChatServerEvent.CONVERSATION_UPDATED]: ChatConversationUpdatedEvent;
  [ChatServerEvent.PARTICIPANT_UPDATED]: ChatParticipantUpdatedEvent;
  [ChatServerEvent.MEMBERSHIP_REVOKED]: ChatMembershipRevokedEvent;
  [ChatServerEvent.MESSAGE_NEW]: ChatMessageEvent;
  [ChatServerEvent.MESSAGE_UPDATED]: ChatMessageEvent;
  [ChatServerEvent.MESSAGE_DELETED]: ChatMessageDeletedEvent;
  [ChatServerEvent.REACTION_UPDATED]: ChatReactionUpdatedEvent;
  [ChatServerEvent.PIN_UPDATED]: ChatPinUpdatedEvent;
  [ChatServerEvent.CURSOR_UPDATED]: ChatCursorUpdatedEvent;
  [ChatServerEvent.TYPING]: ChatTypingEvent;
  [ChatServerEvent.PRESENCE]: ChatPresenceEvent;
}

export type IoFactory = (url: string, options: Partial<ManagerOptions & SocketOptions>) => Socket;

export interface ChatSocketClientOptions {
  /** API origin, e.g. https://api.dhruto.com (namespace is appended). */
  origin: string;
  /** Reads the CURRENT access token (called on every (re)connect attempt). */
  getToken: () => string | null;
  /** Asks the existing REST session layer to refresh tokens. */
  refreshSession: () => Promise<boolean>;
  onStateChange: (state: ChatConnectionState) => void;
  /** Called after every successful connect; `reconnected` is false the first time. */
  onConnected?: (info: { reconnected: boolean }) => void;
  ioFactory?: IoFactory;
  /** Consecutive auth failures before giving up (state `unauthorized`). */
  maxAuthRetries?: number;
  /** Timer seam for tests. */
  schedule?: (fn: () => void, ms: number) => unknown;
  ackTimeoutMs?: number;
}

const AUTH_CODES = new Set<string>([ChatSocketErrorCode.UNAUTHENTICATED, ChatSocketErrorCode.TOKEN_EXPIRED]);

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) return null;
  const data: unknown = error.data;
  return typeof data === "object" && data !== null && "code" in data && typeof data.code === "string"
    ? data.code
    : null;
}

function isAck<T>(value: unknown): value is ChatSocketAck<T> {
  return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean";
}

/**
 * The single `/chat` socket for an authenticated session.
 *
 *  - Token via the `auth` callback (never in the URL), re-read on every attempt.
 *  - Transport drops: Socket.IO's built-in reconnection with exponential
 *    backoff + jitter (1 s .. 15 s).
 *  - Auth rejections (`connect_error` UNAUTHENTICATED/TOKEN_EXPIRED) and
 *    server-initiated disconnects (`session:expired`, flood kick) are NOT
 *    retried by Socket.IO: this client refreshes the session through the
 *    existing REST layer and reconnects with its own capped backoff, giving up
 *    (`unauthorized`) after `maxAuthRetries` consecutive failures — no loops.
 */
export class ChatSocketClient {
  private socket: Socket | null = null;
  private everConnected = false;
  private authFailures = 0;
  private closed = false;
  private readonly maxAuthRetries: number;
  private readonly schedule: (fn: () => void, ms: number) => unknown;
  private readonly ackTimeoutMs: number;

  constructor(private readonly options: ChatSocketClientOptions) {
    this.maxAuthRetries = options.maxAuthRetries ?? 4;
    this.schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    this.ackTimeoutMs = options.ackTimeoutMs ?? 8000;
  }

  connect(): void {
    if (this.socket || this.closed) return;
    const factory = this.options.ioFactory ?? io;
    this.options.onStateChange("connecting");
    const socket = factory(`${this.options.origin}${CHAT_SOCKET_NAMESPACE}`, {
      transports: ["websocket"],
      auth: (callback: (data: object) => void) => callback({ token: this.options.getToken() ?? "" }),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });
    this.socket = socket;

    socket.on("connect", () => {
      this.authFailures = 0;
      this.options.onStateChange("connected");
      this.options.onConnected?.({ reconnected: this.everConnected });
      this.everConnected = true;
    });

    socket.on("disconnect", (reason: string) => {
      if (this.closed || reason === "io client disconnect") {
        this.options.onStateChange("disconnected");
        return;
      }
      this.options.onStateChange("reconnecting");
      // Server kicked us (token expiry, abuse): Socket.IO will not retry on its own.
      if (reason === "io server disconnect") void this.reauthenticateAndReconnect();
    });

    socket.on("connect_error", (error: unknown) => {
      if (this.closed) return;
      const code = errorCode(error);
      if (code && AUTH_CODES.has(code)) {
        void this.reauthenticateAndReconnect();
        return;
      }
      // Transport-level failure: built-in reconnection continues.
      this.options.onStateChange(socket.active ? "reconnecting" : "disconnected");
    });
  }

  private async reauthenticateAndReconnect(): Promise<void> {
    this.authFailures += 1;
    if (this.authFailures > this.maxAuthRetries) {
      this.options.onStateChange("unauthorized");
      return;
    }
    this.options.onStateChange("reconnecting");
    const refreshed = await this.options.refreshSession().catch(() => false);
    if (this.closed) return;
    if (!refreshed && !this.options.getToken()) {
      this.options.onStateChange("unauthorized");
      return;
    }
    const delay = Math.min(1000 * 2 ** (this.authFailures - 1), 15000) * (0.75 + Math.random() * 0.5);
    this.schedule(() => {
      if (!this.closed && this.socket && !this.socket.connected) this.socket.connect();
    }, delay);
  }

  disconnect(): void {
    this.closed = true;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  /** Typed listener registration; returns the unsubscribe function. */
  on<E extends keyof ChatServerEventMap>(event: E, handler: (payload: ChatServerEventMap[E]) => void): () => void {
    const socket = this.socket;
    if (!socket) return () => undefined;
    // Trust boundary: payload shapes are the shared `@dhruto/contracts` types
    // emitted by our own server; the untyped Socket.IO listener is narrowed here.
    const listener = (...args: unknown[]): void => handler(args[0] as ChatServerEventMap[E]);
    socket.on(event as string, listener);
    return () => {
      socket.off(event as string, listener);
    };
  }

  /** Emits with ack. Null when not connected (callers fall back to REST). */
  private async request<T>(event: ChatClientEvent, payload: object): Promise<ChatSocketAck<T> | null> {
    const socket = this.socket;
    if (!socket?.connected) return null;
    try {
      const response: unknown = await socket.timeout(this.ackTimeoutMs).emitWithAck(event, payload);
      return isAck<T>(response) ? response : null;
    } catch {
      return null; // ack timeout / disconnect mid-flight
    }
  }

  join(conversationId: string) {
    return this.request<ChatSocketJoinResult>(ChatClientEvent.CONVERSATION_JOIN, { conversationId });
  }

  leave(conversationId: string) {
    return this.request<{ conversationId: string }>(ChatClientEvent.CONVERSATION_LEAVE, { conversationId });
  }

  typing(conversationId: string, isTyping: boolean) {
    return this.request<unknown>(isTyping ? ChatClientEvent.TYPING_START : ChatClientEvent.TYPING_STOP, {
      conversationId,
    });
  }

  markRead(conversationId: string, lastReadSequence: string) {
    return this.request<ChatCursorState>(ChatClientEvent.CURSOR_READ, { conversationId, lastReadSequence });
  }

  markDelivered(conversationId: string, lastDeliveredSequence: string) {
    return this.request<ChatCursorState>(ChatClientEvent.CURSOR_DELIVERED, { conversationId, lastDeliveredSequence });
  }

  presence(conversationId: string) {
    return this.request<ChatPresenceEntry[]>(ChatClientEvent.PRESENCE_QUERY, { conversationId });
  }
}
