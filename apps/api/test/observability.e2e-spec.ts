import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";
import { CacheService } from "../src/common/cache/cache.service.js";

describe("Scale, Optimization & Observability (Phase 8 E2E)", () => {
  let app: INestApplication;
  let cacheService: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", {
      exclude: ["health", "health/(.*)"],
    });
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    cacheService = app.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. GET /health returns live system status with DB and cache diagnostics", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);

    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("dhruto-api");
    expect(res.body.database).toBe("healthy");
    expect(res.body.cache).toBe("healthy");
    expect(res.body.cacheDriver).toBeDefined();
    expect(typeof res.body.uptime).toBe("number");
  });

  it("2. GET /health/liveness returns healthy for container orchestration", async () => {
    const res = await request(app.getHttpServer()).get("/health/liveness").expect(200);

    expect(res.body.status).toBe("healthy");
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("3. GET /health/readiness verifies live database query ping and latency", async () => {
    const res = await request(app.getHttpServer()).get("/health/readiness").expect(200);

    expect(res.body.status).toBe("ready");
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBe("healthy");
    expect(typeof res.body.checks.databaseLatencyMs).toBe("number");
    expect(res.body.checks.databaseLatencyMs).toBeLessThan(150); // fast DB ping
    expect(res.body.checks.cache).toBe("healthy");
  });

  it("4. GET /health/metrics returns comprehensive observability and telemetry schema", async () => {
    const res = await request(app.getHttpServer()).get("/health/metrics").expect(200);

    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("dhruto-api");
    expect(res.body.environment).toBeDefined();
    expect(res.body.nodeVersion).toBeDefined();
    expect(typeof res.body.uptimeSeconds).toBe("number");

    // Database metrics
    expect(res.body.database.connected).toBe(true);
    expect(typeof res.body.database.latencyMs).toBe("number");
    expect(res.body.database.clientPool).toBeDefined();

    // Cache metrics
    expect(res.body.cache.connected).toBe(true);
    expect(typeof res.body.cache.hitRate).toBe("number");
    expect(typeof res.body.cache.hits).toBe("number");
    expect(typeof res.body.cache.misses).toBe("number");

    // Memory metrics
    expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
    expect(res.body.memory.heapTotalMb).toBeGreaterThan(0);
    expect(res.body.memory.rssMb).toBeGreaterThan(0);

    // Request Telemetry
    expect(res.body.telemetry).toBeDefined();
    expect(typeof res.body.telemetry.totalRequests).toBe("number");
    expect(typeof res.body.telemetry.p50LatencyMs).toBe("number");
    expect(typeof res.body.telemetry.p95LatencyMs).toBe("number");
  });

  it("5. Multi-tier Cache Service stores, retrieves, and evicts entries with accurate telemetry", async () => {
    const testKey = "test:scale:perf-key";
    const testValue = { metric: "throughput", targetRps: 500 };

    await cacheService.set(testKey, testValue, 60);
    const retrieved = await cacheService.get<typeof testValue>(testKey);

    expect(retrieved).toEqual(testValue);

    // Delete key
    await cacheService.del(testKey);
    const afterDel = await cacheService.get(testKey);
    expect(afterDel).toBeNull();
  });

  it("6. Cache-Aside wrapper returns cached result on repeat calls without redundant compute", async () => {
    let callCount = 0;
    const computeFn = async () => {
      callCount++;
      return { answer: 42, calculatedAt: Date.now() };
    };

    const wrapKey = "test:wrap:expensive-calculation";

    // 1st call executes computeFn
    const res1 = await cacheService.wrap(wrapKey, computeFn, 60);
    expect(res1.answer).toBe(42);
    expect(callCount).toBe(1);

    // 2nd call should hit cache and NOT invoke computeFn
    const res2 = await cacheService.wrap(wrapKey, computeFn, 60);
    expect(res2.answer).toBe(42);
    expect(res2.calculatedAt).toBe(res1.calculatedAt);
    expect(callCount).toBe(1); // Call count remained 1

    await cacheService.del(wrapKey);
  });
});
