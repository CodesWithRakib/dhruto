import { CHAT_TYPING_THROTTLE_MS, CHAT_TYPING_TTL_MS } from "@dhruto/contracts";

export type TypingBroadcast = (conversationId: string, isTyping: boolean) => void;

interface TypingState {
  timer: ReturnType<typeof setTimeout>;
  lastBroadcastAt: number;
}

/**
 * Per-socket typing state (in memory, never persisted). Guarantees:
 *  - start is broadcast at most once per throttle window per conversation;
 *    repeated starts within the window only extend the expiry;
 *  - an indicator always ends: explicit stop, TTL expiry, leave, revocation
 *    or disconnect all broadcast exactly one `isTyping: false`.
 */
export class ChatTypingTracker {
  private readonly states = new Map<string, TypingState>();

  constructor(
    private readonly broadcast: TypingBroadcast,
    private readonly ttlMs = CHAT_TYPING_TTL_MS,
    private readonly throttleMs = CHAT_TYPING_THROTTLE_MS,
    private readonly now: () => number = Date.now,
  ) {}

  start(conversationId: string): void {
    const existing = this.states.get(conversationId);
    const now = this.now();
    if (existing) clearTimeout(existing.timer);
    const shouldBroadcast = !existing || now - existing.lastBroadcastAt >= this.throttleMs;
    const timer = setTimeout(() => this.stop(conversationId), this.ttlMs);
    timer.unref?.();
    this.states.set(conversationId, {
      timer,
      lastBroadcastAt: shouldBroadcast ? now : (existing?.lastBroadcastAt ?? now),
    });
    if (shouldBroadcast) this.broadcast(conversationId, true);
  }

  stop(conversationId: string): void {
    const existing = this.states.get(conversationId);
    if (!existing) return;
    clearTimeout(existing.timer);
    this.states.delete(conversationId);
    this.broadcast(conversationId, false);
  }

  stopAll(): void {
    for (const conversationId of [...this.states.keys()]) this.stop(conversationId);
  }

  isTyping(conversationId: string): boolean {
    return this.states.has(conversationId);
  }
}
