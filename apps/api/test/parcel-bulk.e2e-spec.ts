import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { SEEDED_ACCOUNTS, bearer, loginToken } from "./utils/auth.js";
import { realisticName } from "./utils/realistic.js";

/**
 * Phase 6 (Q-BULK): JSON bulk import — template, dry-run validation,
 * per-row import with batch-key idempotency, and row limits.
 */
describe("Parcel bulk import (Phase 6 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;

  const batchKey = () =>
    `bulk-${Date.now()}-${Math.random().toString(16).slice(2, 10)}-testkey!`;

  function row(tag: string, overrides: Record<string, unknown> = {}) {
    return {
      recipientName: realisticName(),
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: `House 7, Road 7, Mirpur, Dhaka`,
      codAmount: 900,
      weight: 1,
      ...overrides,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves a CSV template with the row columns", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/parcels/bulk/template")
      .set(bearer(merchantToken))
      .expect(200);

    expect(res.body.data.columns).toContain("recipientPhone");
    expect(res.body.data.maxRows).toBe(500);
    expect(res.body.data.csvHeader).toContain("codAmount");
  });

  it("dry-runs pricing without persisting parcels", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/validate")
      .set(bearer(merchantToken))
      .send({ rows: [row("v1"), row("v2")] })
      .expect(200);

    expect(res.body.data.total).toBe(2);
    expect(res.body.data.quotable).toBe(2);
    for (const r of res.body.data.rows as Array<{ ok: boolean; deliveryFee: number }>) {
      expect(r.ok).toBe(true);
      expect(typeof r.deliveryFee).toBe("number");
    }
  });

  it("imports rows with per-row results and replays on batch-key retry", async () => {
    // NOTE: the bulk-import scope allows 5/min per authenticated merchant,
    // so this file budgets exactly 5 import calls (import+retry here and
    // one each below). Limiter identity is the user, not the IP.
    const key = batchKey();
    const rows = [row("i1"), row("i2")];
    const first = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", key)
      .send({ rows })
      .expect(201);

    expect(first.body.data.total).toBe(2);
    expect(first.body.data.created).toBe(2);
    expect(first.body.data.failed).toBe(0);
    const codes = (first.body.data.rows as Array<{ trackingCode: string }>).map(
      (r) => r.trackingCode,
    );
    expect(new Set(codes).size).toBe(2);

    // Identical retry replays the original parcels (no duplicates).
    const retry = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", key)
      .send({ rows })
      .expect(201);

    const retryCodes = (retry.body.data.rows as Array<{ trackingCode: string }>).map(
      (r) => r.trackingCode,
    );
    expect(new Set([...codes, ...retryCodes]).size).toBe(2);
  });

  it("rejects missing batch keys, short keys, and oversized batches", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .send({ rows: [row("nokey")] })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", "short")
      .send({ rows: [row("shortkey")] })
      .expect(400);

    const big = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", batchKey())
      .send({ rows: Array.from({ length: 501 }, (_, i) => row(`big${i}`)) })
      .expect(422);
    expect(big.body.success).toBe(false);
  });

  // Product rule: "one bad row never blocks the rest". Previously the batch
  // DTO validated nested rows, so any bad row rejected the whole file (422).
  it("reports invalid rows per row instead of rejecting the batch", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/validate")
      .set(bearer(merchantToken))
      .send({ rows: [row("goodv"), row("bad", { recipientPhone: "011" })] })
      .expect(200);
    const [good, bad] = res.body.data.rows;
    expect(good.ok).toBe(true);
    expect(bad.ok).toBe(false);
    expect(bad.message).toMatch(/mobile number/i);
  });

  it("imports the valid rows of a mixed batch and reports the bad one", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels/bulk/import")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", batchKey())
      .send({ rows: [row("mixgood"), row("mixbad", { district: "" })] })
      .expect((r) => expect(r.status).toBeLessThan(300));
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.rows[1].ok).toBe(false);
  });
});
