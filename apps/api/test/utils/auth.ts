import request from "supertest";
import { type INestApplication } from "@nestjs/common";

export const SEEDED_PASSWORD = "dhruto123";

export const SEEDED_ACCOUNTS = {
  merchant: "merchant@dhruto.com",
  merchant2: "merchant2@dhruto.com",
  admin: "admin@dhruto.com",
  hubManager: "hubmanager@dhruto.com",
  hubManagerCtg: "hubmanager_ctg@dhruto.com",
  rider: "rider@dhruto.com",
} as const;

/** Logs in a seeded account and returns its access token. */
export async function loginToken(
  app: INestApplication,
  email: string,
  password: string = SEEDED_PASSWORD,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ emailOrPhone: email, password });

  const token = res.body?.data?.tokens?.accessToken;
  if (!token) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return token as string;
}

let counter = 0;

/** Generates a unique Idempotency-Key per call. */
export function idempotencyKey(prefix = "test"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(16).slice(2, 10)}`;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
