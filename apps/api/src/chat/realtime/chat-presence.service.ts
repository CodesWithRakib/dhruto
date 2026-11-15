import { Injectable, Logger } from "@nestjs/common";
import { type ChatPresenceEntry } from "@dhruto/contracts";
import { ChatRedisService } from "./chat-redis.service.js";
import { loadChatRealtimeConfig, type ChatRealtimeConfig } from "./chat-realtime.config.js";

export type PresenceBackend = "redis" | "memory";

const connectionsKey = (userId: string) => `dhruto:chat:presence:conn:${userId}`;
const lastSeenKey = (userId: string) => `dhruto:chat:presence:seen:${userId}`;

/**
 * Ephemeral presence (no PostgreSQL writes).
 *
 * Redis model, per user: a sorted set of live connection ids scored by their
 * expiry time. Online = at least one unexpired member.
 *  - Multiple devices: one member per socket (reference counting by set size),
 *    so closing one tab never marks a user offline while another is open.
 *  - Crashed instances: their members simply expire (score < now) and are
 *    swept on the next write/read; keys carry a TTL so idle users leave no
 *    garbage behind (bounded keyspace).
 *  - Transitions are computed atomically (MULTI) so concurrent connects or
 *    disconnects agree on who caused online/offline.
 *
 * When Redis is disabled or unreachable, presence degrades to this instance's
 * own connections (accurate for single-instance deployments only).
 */
@Injectable()
export class ChatPresenceService {
  private readonly logger = new Logger(ChatPresenceService.name);
  private readonly config: ChatRealtimeConfig = loadChatRealtimeConfig();
  /** Fallback: userId -> (connectionId -> expiresAt). */
  private readonly memory = new Map<string, Map<string, number>>();
  private readonly memoryLastSeen = new Map<string, number>();

  constructor(private readonly redis: ChatRedisService) {}

  backend(): PresenceBackend {
    return this.redis.commandClient() && this.redis.isDistributionHealthy() ? "redis" : "memory";
  }

  /** Registers a connection. Returns true when this made the user go online. */
  async connected(userId: string, connectionId: string): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + this.config.presenceTtlMs;
    this.memorySet(userId, connectionId, expiresAt);
    const client = this.activeClient();
    if (!client) return this.memoryCount(userId, now) === 1;
    try {
      const results = await client
        .multi()
        .zremrangebyscore(connectionsKey(userId), 0, now)
        .zadd(connectionsKey(userId), expiresAt, connectionId)
        .zcard(connectionsKey(userId))
        .pexpire(connectionsKey(userId), this.config.presenceTtlMs * 2)
        .exec();
      return Number(results?.[2]?.[1] ?? 0) === 1;
    } catch (error) {
      this.warn("connect", error);
      return this.memoryCount(userId, now) === 1;
    }
  }

  /** Removes a connection. Returns true when the user has no live connections left. */
  async disconnected(userId: string, connectionId: string): Promise<boolean> {
    const now = Date.now();
    this.memory.get(userId)?.delete(connectionId);
    const client = this.activeClient();
    let remaining: number;
    if (!client) {
      remaining = this.memoryCount(userId, now);
    } else {
      try {
        const results = await client
          .multi()
          .zrem(connectionsKey(userId), connectionId)
          .zremrangebyscore(connectionsKey(userId), 0, now)
          .zcard(connectionsKey(userId))
          .exec();
        remaining = Number(results?.[2]?.[1] ?? 0);
        if (remaining === 0) {
          await client.set(
            lastSeenKey(userId),
            String(now),
            "EX",
            this.config.presenceLastSeenTtlSeconds,
          );
        }
      } catch (error) {
        this.warn("disconnect", error);
        remaining = this.memoryCount(userId, now);
      }
    }
    if (remaining === 0) {
      this.memory.delete(userId);
      this.memoryLastSeen.set(userId, now);
    }
    return remaining === 0;
  }

  /** Extends the TTL of this instance's live connections (one pipeline per tick). */
  async heartbeat(
    connections: ReadonlyArray<{ userId: string; connectionId: string }>,
  ): Promise<void> {
    if (connections.length === 0) return;
    const expiresAt = Date.now() + this.config.presenceTtlMs;
    for (const { userId, connectionId } of connections)
      this.memorySet(userId, connectionId, expiresAt);
    const client = this.activeClient();
    if (!client) return;
    try {
      const pipeline = client.pipeline();
      for (const { userId, connectionId } of connections) {
        pipeline.zadd(connectionsKey(userId), expiresAt, connectionId);
        pipeline.pexpire(connectionsKey(userId), this.config.presenceTtlMs * 2);
      }
      await pipeline.exec();
    } catch (error) {
      this.warn("heartbeat", error);
    }
  }

  async getPresence(userIds: readonly string[]): Promise<ChatPresenceEntry[]> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return [];
    const now = Date.now();
    const client = this.activeClient();
    if (client) {
      try {
        const pipeline = client.pipeline();
        for (const id of ids) {
          pipeline.zcount(connectionsKey(id), now, "+inf");
          pipeline.get(lastSeenKey(id));
        }
        const results = (await pipeline.exec()) ?? [];
        return ids.map((userId, index) => {
          const online = Number(results[index * 2]?.[1] ?? 0) > 0;
          const seen = results[index * 2 + 1]?.[1];
          return {
            userId,
            status: online ? "online" : "offline",
            lastSeenAt:
              !online && typeof seen === "string" ? new Date(Number(seen)).toISOString() : null,
          };
        });
      } catch (error) {
        this.warn("query", error);
      }
    }
    return ids.map((userId) => {
      const online = this.memoryCount(userId, now) > 0;
      const seen = this.memoryLastSeen.get(userId);
      return {
        userId,
        status: online ? "online" : "offline",
        lastSeenAt: !online && seen ? new Date(seen).toISOString() : null,
      };
    });
  }

  private activeClient() {
    return this.backend() === "redis" ? this.redis.commandClient() : null;
  }

  private memorySet(userId: string, connectionId: string, expiresAt: number): void {
    let conns = this.memory.get(userId);
    if (!conns) {
      conns = new Map();
      this.memory.set(userId, conns);
    }
    conns.set(connectionId, expiresAt);
  }

  private memoryCount(userId: string, now: number): number {
    const conns = this.memory.get(userId);
    if (!conns) return 0;
    for (const [id, expiresAt] of conns) if (expiresAt <= now) conns.delete(id);
    return conns.size;
  }

  private warn(op: string, error: unknown): void {
    this.logger.warn(
      `PRESENCE_REDIS_FAILED op=${op} error=${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}
