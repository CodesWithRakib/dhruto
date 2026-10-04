import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";

describe("Parcels API Validation (E2E / Integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/v1/parcels - succeeds with valid booking payload", async () => {
    const validPayload = {
      recipientName: "Rafiqul Islam",
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "Section 10, Block C, Mirpur, Dhaka",
      codAmount: 1200,
      weight: 1.5,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(201);
    expect(res.body.data.recipientName).toBe("Rafiqul Islam");
    expect(res.body.data.trackingCode).toMatch(/^DHR-/);
    expect(res.body.data.deliveryFee).toBe(80);
    expect(res.body.data.status).toBe("CREATED");
  });

  it("POST /api/v1/parcels - rejects invalid Bangladesh phone format with 422", async () => {
    const invalidPhonePayload = {
      recipientName: "Rafiqul Islam",
      recipientPhone: "01112345678", // Invalid 011 prefix
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "Section 10, Mirpur, Dhaka",
      codAmount: 1200,
      weight: 1.5,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .send(invalidPhonePayload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/parcels - rejects negative COD amount with validation error", async () => {
    const invalidCodPayload = {
      recipientName: "Rafiqul Islam",
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "Section 10, Mirpur, Dhaka",
      codAmount: -50,
      weight: 1.5,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .send(invalidCodPayload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/parcels - rejects missing district with validation error", async () => {
    const missingDistrictPayload = {
      recipientName: "Rafiqul Islam",
      recipientPhone: "01712345678",
      district: "",
      thana: "Mirpur",
      deliveryAddress: "Section 10, Mirpur, Dhaka",
      codAmount: 1000,
      weight: 1.0,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .send(missingDistrictPayload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
