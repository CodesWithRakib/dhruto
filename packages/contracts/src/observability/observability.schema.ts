import { z } from "zod";

export const databaseHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  latencyMs: z.number(),
  connected: z.boolean(),
  clientPool: z.object({
    total: z.number(),
    idle: z.number(),
    active: z.number(),
  }),
});

export type DatabaseHealth = z.infer<typeof databaseHealthSchema>;

export const cacheHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  driver: z.enum(["redis", "memory-fallback"]),
  connected: z.boolean(),
  latencyMs: z.number(),
  hitRate: z.number(), // Percentage 0-100
  hits: z.number(),
  misses: z.number(),
  keysCount: z.number(),
});

export type CacheHealth = z.infer<typeof cacheHealthSchema>;

export const queueHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  waiting: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
  delayed: z.number(),
});

export type QueueHealth = z.infer<typeof queueHealthSchema>;

export const memoryMetricsSchema = z.object({
  rssMb: z.number(),
  heapTotalMb: z.number(),
  heapUsedMb: z.number(),
  externalMb: z.number(),
});

export type MemoryMetrics = z.infer<typeof memoryMetricsSchema>;

export const requestTelemetrySchema = z.object({
  totalRequests: z.number(),
  totalErrors: z.number(),
  errorRate: z.number(), // Percentage 0-100
  p50LatencyMs: z.number(),
  p95LatencyMs: z.number(),
  p99LatencyMs: z.number(),
  currentRps: z.number(),
});

export type RequestTelemetry = z.infer<typeof requestTelemetrySchema>;

export const systemObservabilitySummarySchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  nodeVersion: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
  database: databaseHealthSchema,
  cache: cacheHealthSchema,
  queue: queueHealthSchema,
  memory: memoryMetricsSchema,
  telemetry: requestTelemetrySchema,
});

export type SystemObservabilitySummary = z.infer<typeof systemObservabilitySummarySchema>;

export const loadTestResultSchema = z.object({
  scenario: z.string(),
  concurrency: z.number(),
  totalRequests: z.number(),
  durationSeconds: z.number(),
  rps: z.number(),
  p50Ms: z.number(),
  p95Ms: z.number(),
  p99Ms: z.number(),
  errorCount: z.number(),
  errorRate: z.number(),
  targetRpsMet: z.boolean(),
  targetP95Met: z.boolean(),
});

export type LoadTestResult = z.infer<typeof loadTestResultSchema>;
