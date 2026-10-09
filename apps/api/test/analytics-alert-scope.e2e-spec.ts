import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { AnalyticsAlert } from "../src/database/entities/AnalyticsAlert.entity.js";
import { SEEDED_ACCOUNTS, bearer, loginToken } from "./utils/auth.js";

/**
 * Phase 4 (T-SCOPE-01): hub managers see platform alerts plus alerts scoped
 * to their assigned hubs — never other scopes. Admins see everything.
 */
describe("Alert hub scoping (Phase 4 E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let dhkToken: string;
  let merchantAlertId: string;
  let platformAlertId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    [adminToken, dhkToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.admin),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
    ]);

    const repo = dataSource.getRepository(AnalyticsAlert);
    const merchantScoped = await repo.save(
      repo.create({
        alertKey: "SUCCESS_RATE_DROP",
        severity: "WARN",
        status: "OPEN",
        scope: "merchant",
        scopeId: "11111111-1111-4111-8111-111111111111",
        metricValue: 10,
        threshold: 85,
        dedupKey: `scope-test-merchant-${Date.now()}`,
        triggeredAt: new Date(),
      }),
    );
    merchantAlertId = merchantScoped.id;

    const platform = await repo.save(
      repo.create({
        alertKey: "RTO_RATE_SPIKE",
        severity: "WARN",
        status: "OPEN",
        scope: "platform",
        scopeId: null,
        metricValue: 99,
        threshold: 15,
        dedupKey: `scope-test-platform-${Date.now()}`,
        triggeredAt: new Date(),
      }),
    );
    platformAlertId = platform.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("hub manager list excludes merchant-scoped alerts", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/analytics/alerts?limit=200")
      .set(bearer(dhkToken))
      .expect(200);

    const rows = res.body.data as Array<{ id: string; scope: string }>;
    expect(rows.some((r) => r.id === merchantAlertId)).toBe(false);
    expect(rows.some((r) => r.id === platformAlertId)).toBe(true);
    for (const row of rows) {
      expect(["platform", "hub"]).toContain(row.scope);
    }
  });

  it("hub manager ack of a merchant-scoped alert is 403", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/analytics/alerts/${merchantAlertId}/ack`)
      .set(bearer(dhkToken))
      .expect(403);
  });

  it("hub manager can ack a platform alert; admin can ack anything", async () => {
    const hubAck = await request(app.getHttpServer())
      .post(`/api/v1/analytics/alerts/${platformAlertId}/ack`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(hubAck.body.data.status).toBe("ACKNOWLEDGED");

    const adminAck = await request(app.getHttpServer())
      .post(`/api/v1/analytics/alerts/${merchantAlertId}/ack`)
      .set(bearer(adminToken))
      .expect(200);
    expect(adminAck.body.data.status).toBe("ACKNOWLEDGED");
  });
});
