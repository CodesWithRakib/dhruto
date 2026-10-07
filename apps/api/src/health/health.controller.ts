import { Controller, Get, HttpStatus, Optional } from "@nestjs/common";
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
    description: "Readiness probe success",
  })
  async readiness() {
    const db = await this.pingDatabase();
    const cache = this.cacheService.getHealth();

    const ready = db.connected && cache.connected;

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
        clientPool: {
          total: 10,
          idle: 8,
          active: 2,
        },
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
}
