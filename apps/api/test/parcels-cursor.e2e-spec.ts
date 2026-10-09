import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { idempotencyKey } from "./utils/auth.js";

describe("Parcel cursor pagination (Phase 8)", () => {
  let app: INestApplication;
  let merchantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ emailOrPhone: "merchant@dhruto.com", password: "dhruto123" })
      .expect(200);
    merchantToken = login.body.data.tokens.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createParcel(tag: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", idempotencyKey(`cursor-${tag}`))
      .send({
        recipientName: "Cursor Probe",
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 1, Road 1, Mirpur 10, Dhaka",
        weight: 1,
        codAmount: 100,
      })
      .expect(201);
    return (res.body.data.id ?? res.body.data.parcelId) as string;
  }

  it("walks pages without overlap and survives concurrent inserts", async () => {
    const page1 = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=5")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const ids1 = (page1.body.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids1.length).toBeGreaterThan(0);
    // ResponseTransformInterceptor hoists meta.pagination to meta.
    const cursor = page1.body.meta.nextCursor as string | null;
    expect(cursor).toBeTruthy();

    // Insert between pages — keyset must neither duplicate nor skip.
    await createParcel("between-a");
    await createParcel("between-b");

    const page2 = await request(app.getHttpServer())
      .get(`/api/v1/parcels?limit=5&cursor=${encodeURIComponent(cursor as string)}`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const ids2 = (page2.body.data as Array<{ id: string }>).map((p) => p.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toEqual([]);

    // Invalid cursor falls back to offset instead of failing.
    await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=5&cursor=garbage!!!")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
  });
});
