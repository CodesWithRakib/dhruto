import { describe, it, expect } from "vitest";
import { CustomJwtService } from "./custom-jwt.service.js";
import { UserRole } from "../../database/entities/User.entity.js";

/**
 * T-SEC-05: token validation behavior. Pure unit tests (no DB).
 * Never logs or prints token values.
 */
describe("CustomJwtService verification (T-SEC-05)", () => {
  const stubConfig = { get: () => undefined };
  const service = new CustomJwtService(stubConfig as never);
  const base = {
    sub: "user-1",
    email: "a@dhruto.com",
    phone: "01712345678",
    role: UserRole.MERCHANT,
    merchantId: null,
    riderId: null,
    hubId: null,
  };

  it("verifies a valid access token", () => {
    const { accessToken } = service.generateAuthTokens({ ...base, id: "user-1" });
    const payload = service.verifyAccessToken(accessToken);
    expect(payload.sub).toBe("user-1");
    expect(payload.type).toBe("access");
  });

  it("rejects a token signed with the wrong secret", () => {
    const { accessToken } = service.generateAuthTokens({ ...base, id: "user-1" });
    const tampered = `${accessToken.slice(0, -1)}${accessToken.endsWith("A") ? "B" : "A"}`;
    expect(() => service.verifyAccessToken(tampered)).toThrow(/signature/i);
  });

  it("rejects expired tokens", () => {
    const token = service.sign({ ...base, type: "access" }, "test-secret-0123456789abcdef", -10);
    expect(() => service.verify(token, "test-secret-0123456789abcdef")).toThrow(/expired/i);
  });

  it("rejects a token with an unexpected algorithm", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payload = Buffer.from(JSON.stringify({ sub: "x" }))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(() => service.verify(`${header}.${payload}.sig`, "any-secret")).toThrow();
  });

  it("rejects malformed tokens", () => {
    expect(() => service.verifyAccessToken("not-a-token")).toThrow(/malformed/i);
    expect(() => service.verifyAccessToken("")).toThrow();
    expect(() => service.verifyAccessToken("a.b")).toThrow(/malformed/i);
  });

  it("rejects a refresh-typed token presented as an access token", () => {
    // Same signing secret, wrong token type: passes the signature check,
    // fails the type check.
    const token = service.sign(
      { ...base, type: "refresh" },
      "dhruto_dev_jwt_access_secret_change_in_production_32chars",
      "15m",
    );
    expect(() => service.verifyAccessToken(token)).toThrow(/token type/i);
  });

  it("rejects a token signed for refresh use at the access entrypoint", () => {
    const { refreshToken } = service.generateAuthTokens({ ...base, id: "user-1" });
    expect(() => service.verifyAccessToken(refreshToken)).toThrow();
    expect(service.verifyRefreshToken(refreshToken).type).toBe("refresh");
  });
});
