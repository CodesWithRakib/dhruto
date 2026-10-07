import { Controller, Get, HttpStatus, Optional, Res, Header } from "@nestjs/common";
import type { Response } from "express";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from "@nestjs/swagger";
import { DataSource } from "typeorm";
import {
  type SystemObservabilitySummary,
  type DatabaseHealth,
  type QueueHealth,
} from "@dhruto/contracts";
import { CacheService } from "../common/cache/cache.service.js";
import { TelemetryService } from "../common/interceptors/telemetry.interceptor.js";
import { queueCounts } from "../integrations/queue-helper.js";

@ApiTags("Health & Observability")
@Controller(["health", "system"])
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly telemetryService: TelemetryService,
    @Optional() @InjectQueue("notifications") private readonly notificationsQueue?: Queue,
    @Optional() @InjectQueue("webhooks") private readonly webhooksQueue?: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: "System Health Summary" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Service is online and running",
  })
  async check() {
    const db = await this.pingDatabase();
    const cache = this.cacheService.getHealth();

    const isHealthy = db.status === "healthy" && cache.status === "healthy";

    return {
      status: isHealthy ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "dhruto-api",
      version: "0.1.0",
      database: db.status,
      cache: cache.status,
      cacheDriver: cache.driver,
    };
  }

  @Get("liveness")
  @ApiOperation({ summary: "Liveness Probe for Kubernetes/Container Health" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Liveness probe success",
  })
  liveness() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get("readiness")
  @ApiOperation({ summary: "Readiness Probe actively verifying DB and Cache" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Ready to receive traffic",
  })
  @SwaggerApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "Not ready — orchestrator must not route traffic here",
  })
  async readiness(@Res({ passthrough: true }) res: Response) {
    const db = await this.pingDatabase();
    const cache = this.cacheService.getHealth();

    const ready = db.connected && cache.connected;
    if (!ready) res.status(HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: db.status,
        databaseLatencyMs: db.latencyMs,
        cache: cache.status,
        cacheDriver: cache.driver,
        cacheLatencyMs: cache.latencyMs,
      },
    };
  }

  @Get("metrics")
  @ApiOperation({ summary: "Comprehensive System Observability & Telemetry Metrics" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Full observability summary",
  })
  async metrics(): Promise<SystemObservabilitySummary> {
    const db = await this.pingDatabase();
    const cache = this.cacheService.getHealth();
    const telemetry = this.telemetryService.getTelemetry();

    const mem = process.memoryUsage();
    const memory = {
      rssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
      heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(1)),
      heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(1)),
      externalMb: Number((mem.external / (1024 * 1024)).toFixed(1)),
    };

    // Real BullMQ counters (degraded shape when Redis is unreachable —
    // never hardcoded numbers).
    const [notifications, webhooks] = await Promise.all([
      this.notificationsQueue
        ? queueCounts(this.notificationsQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
      this.webhooksQueue
        ? queueCounts(this.webhooksQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    ]);
    const queue: QueueHealth = {
      status: notifications.reachable && webhooks.reachable ? "healthy" : "degraded",
      waiting: notifications.waiting + webhooks.waiting,
      active: notifications.active + webhooks.active,
      completed: notifications.completed + webhooks.completed,
      failed: notifications.failed + webhooks.failed,
      delayed: notifications.delayed + webhooks.delayed,
    };

    const isHealthy = db.connected && cache.connected;

    return {
      status: isHealthy ? "healthy" : "degraded",
      service: "dhruto-api",
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: db,
      cache,
      queue,
      memory,
      telemetry,
    };
  }

  @Get("metrics/prometheus")
  @ApiOperation({ summary: "Prometheus text exposition (no extra dependency)" })
  @Header("Content-Type", "text/plain; version=0.0.4")
  async prometheus(): Promise<string> {
    // Hand-rolled exposition from the existing in-process telemetry, pool
    // counters and BullMQ queue depths. No prom-client dependency, no
    // histograms — RED signals for dashboards/alerts, not a replacement
    // for APM tracing (documented decision in docs/production-readiness.md).
    const telemetry = this.telemetryService.getTelemetry();
    const db = await this.pingDatabase();
    const cache = this.cacheService.getHealth();
    const [notifications, webhooks] = await Promise.all([
      this.notificationsQueue
        ? queueCounts(this.notificationsQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
      this.webhooksQueue
        ? queueCounts(this.webhooksQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    ]);
    const mem = process.memoryUsage();
    const lines = [
      "# HELP dhruto_http_requests_total Total HTTP requests.",
      "# TYPE dhruto_http_requests_total counter",
      `dhruto_http_requests_total ${telemetry.totalRequests}`,
      "# HELP dhruto_http_errors_total Total HTTP error responses.",
      "# TYPE dhruto_http_errors_total counter",
      `dhruto_http_errors_total ${telemetry.totalErrors}`,
      "# HELP dhruto_http_latency_ms Request latency percentiles.",
      "# TYPE dhruto_http_latency_ms gauge",
      `dhruto_http_latency_ms{quantile="0.5"} ${telemetry.p50LatencyMs}`,
      `dhruto_http_latency_ms{quantile="0.95"} ${telemetry.p95LatencyMs}`,
      `dhruto_http_latency_ms{quantile="0.99"} ${telemetry.p99LatencyMs}`,
      "# HELP dhruto_http_rps Current requests per second.",
      "# TYPE dhruto_http_rps gauge",
      `dhruto_http_rps ${telemetry.currentRps}`,
      "# HELP dhruto_db_up Database reachability (1/0).",
      "# TYPE dhruto_db_up gauge",
      `dhruto_db_up ${db.connected ? 1 : 0}`,
      "# HELP dhruto_db_latency_ms Last DB ping latency.",
      "# TYPE dhruto_db_latency_ms gauge",
      `dhruto_db_latency_ms ${db.latencyMs}`,
      "# HELP dhruto_db_pool_connections pg pool counters.",
      "# TYPE dhruto_db_pool_connections gauge",
      `dhruto_db_pool_connections{state="total"} ${db.clientPool.total}`,
      `dhruto_db_pool_connections{state="idle"} ${db.clientPool.idle}`,
      `dhruto_db_pool_connections{state="active"} ${db.clientPool.active}`,
      "# HELP dhruto_queue_jobs BullMQ job counts by queue and state.",
      "# TYPE dhruto_queue_jobs gauge",
      ...["waiting", "active", "completed", "failed", "delayed"].flatMap((state) => [
        `dhruto_queue_jobs{queue="notifications",state="${state}"} ${notifications[state as keyof typeof notifications] as number}`,
        `dhruto_queue_jobs{queue="webhooks",state="${state}"} ${webhooks[state as keyof typeof webhooks] as number}`,
      ]),
      "# HELP dhruto_cache_hit_rate Cache hit rate percent.",
      "# TYPE dhruto_cache_hit_rate gauge",
      `dhruto_cache_hit_rate ${cache.hitRate ?? 0}`,
      "# HELP dhruto_process_memory_bytes Process memory.",
      "# TYPE dhruto_process_memory_bytes gauge",
      `dhruto_process_memory_bytes{area="rss"} ${mem.rss}`,
      `dhruto_process_memory_bytes{area="heapUsed"} ${mem.heapUsed}`,
    ];
    return `${lines.join("\n")}\n`;
  }

  private async pingDatabase(): Promise<DatabaseHealth> {
    const start = performance.now();
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: "unhealthy",
          latencyMs: 0,
          connected: false,
          clientPool: { total: 0, idle: 0, active: 0 },
        };
      }

      await this.dataSource.query("SELECT 1");
      const latencyMs = Number((performance.now() - start).toFixed(2));

      return {
        status: latencyMs < 100 ? "healthy" : "degraded",
        latencyMs,
        connected: true,
        clientPool: this.readPoolStats(),
      };
    } catch {
      return {
        status: "unhealthy",
        latencyMs: Number((performance.now() - start).toFixed(2)),
        connected: false,
        clientPool: { total: 0, idle: 0, active: 0 },
      };
    }
  }

  /**
   * Real pg-pool counters (total/idle/waiting). Falls back to zeros when the
   * driver is not a pg pool (tests, alternate drivers) — never fake numbers.
   */
  private readPoolStats(): { total: number; idle: number; active: number } {
    try {
      const driver = this.dataSource.driver as unknown as {
        master?: { totalCount?: number; idleCount?: number; waitingCount?: number };
      };
      const pool = driver.master;
      if (!pool || typeof pool.totalCount !== "number") {
        return { total: 0, idle: 0, active: 0 };
      }
      const total = pool.totalCount;
      const idle = pool.idleCount ?? 0;
      return { total, idle, active: Math.max(0, total - idle) };
    } catch {
      return { total: 0, idle: 0, active: 0 };
    }
  }
}
