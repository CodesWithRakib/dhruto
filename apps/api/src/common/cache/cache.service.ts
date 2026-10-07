import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { type CacheHealth } from "@dhruto/contracts";
import { type RedisConfig } from "../../config/redis.config.js";

interface MemoryCacheEntry {
  value: unknown;
  expiresAt: number | null; // null means no expiration
  lastAccessed: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // In-memory fallback cache with TTL & LRU eviction
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly maxMemoryEntries = 5000;

  // Telemetry metrics
  private hits = 0;
  private misses = 0;
  private totalLatencyMs = 0;
  private operationsCount = 0;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisConf = this.configService.get<RedisConfig>("redis");
    try {
      const redisOptions = redisConf?.url
        ? {
            lazyConnect: true,
            connectTimeout: 1500,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Do not spam retries if redis is not running
          }
        : {
            host: redisConf?.host || "localhost",
            port: redisConf?.port || 6379,
            lazyConnect: true,
            connectTimeout: 1500,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
          };

      const client = redisConf?.url ? new Redis(redisConf.url, redisOptions) : new Redis(redisOptions);

      client.on("connect", () => {
        this.isRedisConnected = true;
        this.logger.log("Connected to Redis cache layer successfully");
      });

      client.on("error", (err) => {
        if (this.isRedisConnected) {
          this.logger.warn(`Redis disconnected: ${err.message}. Using high-performance in-memory cache fallback.`);
        }
        this.isRedisConnected = false;
      });

      // Attempt initial connection with a short timeout
      await Promise.race([
        client.connect().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);

      if (client.status === "ready" || client.status === "connect") {
        this.redisClient = client;
        this.isRedisConnected = true;
      } else {
        this.logger.log("Redis not available. Initialized resilient in-memory TTL/LRU cache layer.");
      }
    } catch {
      this.logger.log("Operating cache in high-performance in-memory mode.");
    }

    // Periodic sweep for expired in-memory cache entries every 60 seconds
    setInterval(() => this.purgeExpiredMemory(), 60000).unref();
  }

  async onModuleDestroy() {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.quit().catch(() => {});
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    try {
      if (this.isRedisConnected && this.redisClient) {
        const data = await this.redisClient.get(key);
        this.recordTelemetry(performance.now() - start, !!data);
        if (!data) return null;
        return JSON.parse(data) as T;
      }

      // In-memory fallback
      const entry = this.memoryCache.get(key);
      if (!entry) {
        this.recordTelemetry(performance.now() - start, false);
        return null;
      }

      const now = Date.now();
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        this.recordTelemetry(performance.now() - start, false);
        return null;
      }

      entry.lastAccessed = now;
      this.recordTelemetry(performance.now() - start, true);
      return entry.value as T;
    } catch (err) {
      this.logger.warn(`Cache read error for key "${key}": ${(err as Error).message}`);
      this.recordTelemetry(performance.now() - start, false);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const start = performance.now();
    try {
      if (this.isRedisConnected && this.redisClient) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await this.redisClient.set(key, serialized, "EX", ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
        this.recordTelemetry(performance.now() - start, true);
        return;
      }

      // In-memory set with LRU eviction
      if (this.memoryCache.size >= this.maxMemoryEntries) {
        this.evictLruMemory();
      }

      const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
      this.memoryCache.set(key, {
        value,
        expiresAt,
        lastAccessed: Date.now(),
      });
      this.recordTelemetry(performance.now() - start, true);
    } catch (err) {
      this.logger.warn(`Cache write error for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
      this.memoryCache.delete(key);
    } catch (err) {
      this.logger.warn(`Cache delete error for key "${key}": ${(err as Error).message}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        // SCAN (not KEYS): non-blocking on large keyspaces. Batch 100.
        let cursor = "0";
        do {
          const [next, keys] = (await this.redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100)) as [string, string[]];
          cursor = next;
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } while (cursor !== "0");
      }

      // In-memory pattern delete (simple prefix / wildcard match)
      const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      for (const key of this.memoryCache.keys()) {
        if (regexPattern.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (err) {
      this.logger.warn(`Cache delPattern error for pattern "${pattern}": ${(err as Error).message}`);
    }
  }

  /**
   * Cache-Aside wrapper with single-flight: concurrent misses for the same
   * key share one fetcher promise instead of stampeding the database.
   * Failures are not cached; the flight entry is always released.
   */
  private readonly inflight = new Map<string, Promise<unknown>>();

  async wrap<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const ongoing = this.inflight.get(key);
    if (ongoing) {
      return ongoing as Promise<T>;
    }
    const flight = (async (): Promise<T> => {
      try {
        const fresh = await fetcher();
        if (fresh !== null && fresh !== undefined) {
          await this.set(key, fresh, ttlSeconds);
        }
        return fresh;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, flight);
    return flight;
  }

  getHealth(): CacheHealth {
    const totalOps = this.hits + this.misses;
    const hitRate = totalOps > 0 ? Math.round((this.hits / totalOps) * 100) : 100;
    const avgLatency = this.operationsCount > 0 ? Number((this.totalLatencyMs / this.operationsCount).toFixed(2)) : 0.5;

    return {
      status: "healthy",
      driver: this.isRedisConnected ? "redis" : "memory-fallback",
      connected: true,
      latencyMs: avgLatency,
      hitRate,
      hits: this.hits,
      misses: this.misses,
      keysCount: this.memoryCache.size,
    };
  }

  private recordTelemetry(latencyMs: number, isHit: boolean) {
    this.operationsCount++;
    this.totalLatencyMs += latencyMs;
    if (isHit) {
      this.hits++;
    } else {
      this.misses++;
    }
  }

  private purgeExpiredMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  private evictLruMemory() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
}
