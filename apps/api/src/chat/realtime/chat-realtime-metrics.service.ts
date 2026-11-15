import { Injectable } from "@nestjs/common";
import { ChatRedisService, type RealtimeRedisStatus } from "./chat-redis.service.js";

export interface ChatRealtimeHealth {
  /** Ready to serve realtime: distribution healthy, or Redis not required. */
  ready: boolean;
  redisRequired: boolean;
  gatewayInitialized: boolean;
  redis: RealtimeRedisStatus;
  presenceBackend: "redis" | "memory";
  connections: { current: number; total: number; rejected: number };
  events: {
    received: number;
    rateLimited: number;
    invalid: number;
    joinsDenied: number;
    revocations: number;
  };
  fanout: {
    delivered: number;
    failed: number;
    skipped: number;
    lastLatencyMs: number | null;
    maxLatencyMs: number;
  };
}

/**
 * In-process counters for the realtime engine (per instance; aggregate across
 * instances in the metrics backend). Exposed via `/health/realtime` and the
 * readiness probe. Contains no user identifiers or content.
 */
@Injectable()
export class ChatRealtimeMetricsService {
  private gatewayInitialized = false;
  private connectionsCurrent = 0;
  private connectionsTotal = 0;
  private connectionsRejected = 0;
  private eventsReceived = 0;
  private eventsRateLimited = 0;
  private eventsInvalid = 0;
  private joinsDenied = 0;
  private revocations = 0;
  private fanoutDelivered = 0;
  private fanoutFailed = 0;
  private fanoutSkipped = 0;
  private lastLatencyMs: number | null = null;
  private maxLatencyMs = 0;
  presenceBackend: () => "redis" | "memory" = () => "memory";

  constructor(private readonly redis: ChatRedisService) {}

  gatewayReady(): void {
    this.gatewayInitialized = true;
  }
  isGatewayInitialized(): boolean {
    return this.gatewayInitialized;
  }
  connectionOpened(): void {
    this.connectionsCurrent += 1;
    this.connectionsTotal += 1;
  }
  connectionClosed(): void {
    this.connectionsCurrent = Math.max(0, this.connectionsCurrent - 1);
  }
  connectionRejected(): void {
    this.connectionsRejected += 1;
  }
  eventReceived(): void {
    this.eventsReceived += 1;
  }
  eventRateLimited(): void {
    this.eventsRateLimited += 1;
  }
  eventInvalid(): void {
    this.eventsInvalid += 1;
  }
  joinDenied(): void {
    this.joinsDenied += 1;
  }
  revoked(count = 1): void {
    this.revocations += count;
  }
  fanoutDone(latencyMs: number): void {
    this.fanoutDelivered += 1;
    this.lastLatencyMs = latencyMs;
    this.maxLatencyMs = Math.max(this.maxLatencyMs, latencyMs);
  }
  fanoutFailure(): void {
    this.fanoutFailed += 1;
  }
  fanoutSkip(): void {
    this.fanoutSkipped += 1;
  }

  health(): ChatRealtimeHealth {
    const redis = this.redis.status();
    const redisRequired = this.redis.isRedisRequired();
    return {
      // Never "ready" when Redis is required but cross-instance fan-out is broken.
      ready: this.gatewayInitialized && (!redisRequired || redis.healthy),
      redisRequired,
      gatewayInitialized: this.gatewayInitialized,
      redis,
      presenceBackend: this.presenceBackend(),
      connections: {
        current: this.connectionsCurrent,
        total: this.connectionsTotal,
        rejected: this.connectionsRejected,
      },
      events: {
        received: this.eventsReceived,
        rateLimited: this.eventsRateLimited,
        invalid: this.eventsInvalid,
        joinsDenied: this.joinsDenied,
        revocations: this.revocations,
      },
      fanout: {
        delivered: this.fanoutDelivered,
        failed: this.fanoutFailed,
        skipped: this.fanoutSkipped,
        lastLatencyMs: this.lastLatencyMs,
        maxLatencyMs: this.maxLatencyMs,
      },
    };
  }
}
