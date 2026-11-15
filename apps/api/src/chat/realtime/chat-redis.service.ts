import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis, type RedisOptions } from "ioredis";
import { type Server } from "socket.io";
import { type RedisConfig } from "../../config/redis.config.js";
import { getErrorMessage } from "../../common/utils/error.util.js";
import { loadChatRealtimeConfig, type ChatRealtimeConfig } from "./chat-realtime.config.js";

/**
 * ioredis publisher that never produces unhandled rejections.
 *
 * `@socket.io/redis-adapter` calls `pubClient.publish(...)` without a
 * `.catch()`. With `enableOfflineQueue: false` a publish during an outage
 * rejects immediately; unhandled, that would surface as process-level
 * unhandled rejections. Failures are counted and logged instead — durable
 * recovery is PostgreSQL + REST gap-fill, and the outbox relay retries while
 * the health probe reports Redis down.
 */
class ResilientPublisher extends Redis {
  publishFailures = 0;

  override publish(channel: string | Buffer, message: string | Buffer): Promise<number> {
    return super.publish(channel, message).catch(() => {
      this.publishFailures += 1;
      return 0;
    });
  }
}

export type RealtimeDistribution = "redis" | "memory";

export interface RealtimeRedisStatus {
  /** Configured mode: Redis adapter, or single-instance in-memory adapter. */
  distribution: RealtimeDistribution;
  /** Pub + sub connected and the last probe succeeded. */
  healthy: boolean;
  publisher: string;
  subscriber: string;
  lastProbeAt: string | null;
  lastProbeOk: boolean;
  publishFailures: number;
}

/**
 * Owns the two dedicated Redis connections used by realtime chat (the
 * Socket.IO adapter needs a subscriber connection in pub/sub mode; the cache
 * client never reconnects by design, so it cannot be reused). Same Redis
 * deployment and configuration (`REDIS_URL` / `REDIS_HOST` / Upstash) as the
 * rest of the API — no additional infrastructure.
 *
 *  - Startup never blocks: connections are established in the background
 *    with capped exponential reconnects.
 *  - A periodic PING (with command timeout) is the source of truth for
 *    `healthy`; the realtime fan-out refuses to publish while unhealthy so the
 *    outbox relay retries instead of silently dropping cross-instance events.
 *  - Graceful shutdown quits both connections.
 */
@Injectable()
export class ChatRedisService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(ChatRedisService.name);
  private readonly config: ChatRealtimeConfig;
  private pub: ResilientPublisher | null = null;
  private sub: Redis | null = null;
  private probeTimer: NodeJS.Timeout | null = null;
  private lastProbeAt: Date | null = null;
  private lastProbeOk = false;
  private adapterAttached = false;

  constructor(private readonly configService: ConfigService) {
    this.config = loadChatRealtimeConfig();
  }

  onModuleInit(): void {
    if (!this.config.redisEnabled) {
      this.logger.warn(
        "Realtime Redis disabled (CHAT_REALTIME_REDIS_ENABLED=false): single-instance mode",
      );
      return;
    }
    this.ensureClients();
  }

  /**
   * Creates the connections once. Called from onModuleInit AND attachAdapter:
   * NestJS runs gateway `afterInit` (which attaches the adapter) BEFORE
   * `onModuleInit`, so lazy creation is required for the adapter to be Redis
   * backed at all.
   */
  private ensureClients(): void {
    if (!this.config.redisEnabled || this.pub) return;
    const redis = this.configService.get<RedisConfig>("redis");
    const base: RedisOptions = {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => Math.min(250 * 2 ** Math.min(times, 5), 5000),
    };
    const target: RedisOptions = redis?.url
      ? {}
      : { host: redis?.host ?? "localhost", port: redis?.port ?? 6379 };
    // Publisher: fail fast while disconnected (no unbounded offline queue).
    const pubOptions: RedisOptions = {
      ...base,
      ...target,
      enableOfflineQueue: false,
      commandTimeout: 2000,
    };
    // Subscriber: queue PSUBSCRIBE until connected; ioredis re-subscribes on reconnect.
    const subOptions: RedisOptions = { ...base, ...target, enableOfflineQueue: true };
    this.pub = redis?.url
      ? new ResilientPublisher(redis.url, pubOptions)
      : new ResilientPublisher(pubOptions);
    this.sub = redis?.url ? new Redis(redis.url, subOptions) : new Redis(subOptions);

    for (const [name, client] of [
      ["publisher", this.pub],
      ["subscriber", this.sub],
    ] as const) {
      client.on("ready", () => this.logger.log(`REALTIME_REDIS_READY client=${name}`));
      client.on("error", (err: Error) =>
        this.logger.warn(`REALTIME_REDIS_ERROR client=${name} error=${err.message}`),
      );
      client.on("end", () => this.logger.warn(`REALTIME_REDIS_ENDED client=${name}`));
      void client
        .connect()
        .catch((err: unknown) =>
          this.logger.warn(
            `REALTIME_REDIS_CONNECT_FAILED client=${name} error=${getErrorMessage(err, "unknown")}`,
          ),
        );
    }

    this.probeTimer = setInterval(() => void this.probe(), this.config.redisProbeMs);
    this.probeTimer.unref?.();
    void this.probe();
  }

  onModuleDestroy(): void {
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = null;
  }

  /**
   * Closes the connections AFTER NestJS has disposed the Socket.IO server.
   * Nest runs onModuleDestroy before closing gateways; the Redis adapter's
   * close() still issues (P)UNSUBSCRIBE on the subscriber, so quitting here —
   * in onApplicationShutdown — avoids commands on a closed connection
   * (unhandled rejections) during graceful shutdown.
   */
  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [this.pub, this.sub].map((client) =>
        client ? client.quit().catch(() => client.disconnect()) : Promise.resolve(),
      ),
    );
  }

  /** Attaches the Redis adapter to the Socket.IO server (all namespaces). Idempotent. */
  attachAdapter(server: Server): void {
    this.ensureClients();
    if (!this.pub || !this.sub || this.adapterAttached) return;
    server.adapter(createAdapter(this.pub, this.sub, { key: "dhruto-socket.io" }));
    this.adapterAttached = true;
    this.logger.log("Socket.IO Redis adapter attached (cross-instance fan-out enabled)");
  }

  /** Connection for ephemeral commands (presence). Null in single-instance mode. */
  commandClient(): Redis | null {
    return this.pub;
  }

  /** True when cross-instance distribution is configured AND currently working. */
  isDistributionHealthy(): boolean {
    if (!this.config.redisEnabled) return true; // single-instance: nothing to distribute
    return this.status().healthy;
  }

  isRedisEnabled(): boolean {
    return this.config.redisEnabled;
  }

  isRedisRequired(): boolean {
    return this.config.redisRequired;
  }

  status(): RealtimeRedisStatus {
    const publisher = this.pub?.status ?? "disabled";
    const subscriber = this.sub?.status ?? "disabled";
    return {
      distribution: this.config.redisEnabled ? "redis" : "memory",
      healthy:
        this.config.redisEnabled &&
        this.adapterAttached &&
        publisher === "ready" &&
        subscriber === "ready" &&
        this.lastProbeOk,
      publisher,
      subscriber,
      lastProbeAt: this.lastProbeAt?.toISOString() ?? null,
      lastProbeOk: this.lastProbeOk,
      publishFailures: this.pub?.publishFailures ?? 0,
    };
  }

  /**
   * Re-runs the health probe now (used before deciding to fail a fan-out).
   * Returns overall distribution health — a successful PING alone is not
   * enough (the adapter must be attached and both connections ready).
   */
  async probe(): Promise<boolean> {
    const pub = this.pub;
    if (!pub) return false;
    try {
      await pub.ping();
      this.lastProbeOk = true;
    } catch {
      if (this.lastProbeOk) this.logger.warn("REALTIME_REDIS_PROBE_FAILED");
      this.lastProbeOk = false;
    }
    this.lastProbeAt = new Date();
    return this.status().healthy;
  }
}
