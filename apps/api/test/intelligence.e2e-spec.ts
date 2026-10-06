import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";
import { DeliveryZone } from "@dhruto/contracts";
import { idempotencyKey } from "./utils/auth.js";

describe("Intelligence Engine: Address Parsing & Recipient Risk Scoring (Phase 6 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // Authenticate as merchant
    const merchantLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        emailOrPhone: "merchant@dhruto.com",
        password: "dhruto123",
      })
      .expect(200);

    merchantToken = merchantLogin.body.data.tokens.accessToken;
    expect(merchantToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Parses well-structured English address with postal code (High Confidence)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/parse-address")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        rawAddress: "House 12, Road 4, Sector 7, Uttara, Dhaka-1230",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.district).toBe("Dhaka");
    expect(data.thana).toBe("Uttara");
    expect(data.zone).toBe(DeliveryZone.INSIDE_DHAKA);
    expect(data.postalCode).toBe("1230");
    expect(data.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(data.confidenceTier).toBe("HIGH");
  });

  it("2. Parses Bengali address and detects Bengali script", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/parse-address")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        rawAddress: "বাসা ১৫, রোড ২, ধানমন্ডি, ঢাকা",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.district).toBe("Dhaka");
    expect(data.thana).toBe("Dhanmondi");
    expect(data.language).toBe("BN");
    expect(data.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it("3. Identifies Outside Dhaka delivery location and correct zone", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/parse-address")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        rawAddress: "Agrabad Commercial Area, Chittagong-4100",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.district).toBe("Chittagong");
    expect(data.thana).toBe("Agrabad");
    expect(data.zone).toBe(DeliveryZone.OUTSIDE_DHAKA);
    expect(data.postalCode).toBe("4100");
  });

  it("4. Performs fuzzy match on misspelled district and thana", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/parse-address")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        rawAddress: "Flat 4B, Dhanmandi, Dhka",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.district).toBe("Dhaka");
    expect(data.thana).toBe("Dhanmondi");
    expect(Array.isArray(data.suggestedCorrections)).toBe(true);
  });

  it("5. Evaluates recipient risk for standard COD parcel", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/evaluate-risk")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientPhone: "01712345678",
        codAmount: 1500,
        rawAddress: "House 20, Road 5, Dhanmondi, Dhaka",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.normalizedPhone).toBe("01712345678");
    expect(typeof data.riskScore).toBe("number");
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(data.riskTier);
    expect(typeof data.rtoProbability).toBe("number");
    expect(Array.isArray(data.riskFactors)).toBe(true);
    expect(Array.isArray(data.operationalRecommendations)).toBe(true);
  });

  it("6. Detects high risk for high COD order with zero past delivery history", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/evaluate-risk")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientPhone: "01899112233",
        codAmount: 15000,
        rawAddress: "Somewhere in village",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.riskScore).toBeGreaterThan(40);
    const codFactor = data.riskFactors.find((f: { code: string }) => f.code === "HIGH_COD_VALUE");
    expect(codFactor).toBeDefined();
    expect(data.requiresPhoneVerification).toBe(true);
  });

  it("7. Flags critical risk on invalid phone number", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/evaluate-risk")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientPhone: "1234567890",
        codAmount: 1200,
        rawAddress: "House 5, Mirpur, Dhaka",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    const phoneFactor = data.riskFactors.find(
      (f: { code: string; impact?: string }) => f.code === "INVALID_PHONE_FORMAT",
    );
    expect(phoneFactor).toBeDefined();
    expect(phoneFactor.impact).toBe("CRITICAL");
  });

  it("8. Performs one-shot booking intelligence analysis via /intelligence/analyze-booking", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/analyze-booking")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientPhone: "01755443322",
        codAmount: 2200,
        rawAddress: "Plot 10, Road 8, Gulshan 1, Dhaka",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.parsedAddress).toBeDefined();
    expect(res.body.data.parsedAddress.thana).toBe("Gulshan");
    expect(res.body.data.riskProfile).toBeDefined();
    expect(res.body.data.riskProfile.rtoProbability).toBeDefined();
  });

  it("9. Automatically attaches address confidence and risk metrics on parcel booking", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", idempotencyKey("intelligence-parcel"))
      .send({
        recipientName: "Smart Delivery Test",
        recipientPhone: "01788776655",
        deliveryAddress: "House 10, Road 4, Banani, Dhaka-1213",
        district: "Dhaka",
        thana: "Banani",
        codAmount: 2500,
        weight: 1,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    const parcelId = res.body.data.id;

    // Fetch parcel details and verify embedded intelligence
    const details = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    const intelligence = details.body.data.addressIntelligence;
    expect(intelligence).toBeDefined();
    expect(intelligence.district).toBe("Dhaka");
    expect(intelligence.thana).toBe("Banani");
    expect(typeof intelligence.confidenceScore).toBe("number");
    expect(intelligence.riskTier).toBeDefined();
  });
});
