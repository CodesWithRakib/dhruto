import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { SEEDED_ACCOUNTS, SEEDED_PASSWORD, bearer, loginToken } from "./utils/auth.js";

/**
 * Regression: `/merchants/me/*` auto-creates a merchant profile for the
 * caller. RolesGuard admits ADMIN everywhere, so an admin opening a merchant
 * page used to create a phantom "<name>'s Shop" merchant row.
 */
describe("Merchant profile scope (/merchants/me) E2E", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    dataSource = app.get(DataSource);
    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
  });

  afterAll(async () => {
    await app.close();
  });

  const merchantRowsFor = async (userId: string) =>
    Number(
      (
        await dataSource.query(`SELECT COUNT(*)::int AS n FROM merchants WHERE user_id = $1`, [
          userId,
        ])
      )[0].n,
    );

  it("serves merchants their own dashboard", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/merchants/me/dashboard")
      .set(bearer(merchantToken))
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it.each([
    ["admin", SEEDED_ACCOUNTS.admin],
    ["hub manager", SEEDED_ACCOUNTS.hubManager],
  ])("refuses %s accounts without creating a merchant profile", async (_label, email) => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ emailOrPhone: email, password: SEEDED_PASSWORD })
      .expect(200);
    const token = login.body.data.tokens.accessToken as string;
    const userId = login.body.data.user.id as string;
    const before = await merchantRowsFor(userId);

    for (const path of ["/api/v1/merchants/me", "/api/v1/merchants/me/dashboard"]) {
      await request(app.getHttpServer()).get(path).set(bearer(token)).expect(403);
    }
    expect(await merchantRowsFor(userId)).toBe(before);
    expect(before).toBe(0);
  });
});
