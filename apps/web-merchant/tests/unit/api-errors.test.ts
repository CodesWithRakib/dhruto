import { describe, expect, it } from "vitest";
import { ApiErrorCode } from "@dhruto/contracts";
import { getApiErrorKey } from "../../lib/api-errors";

describe("getApiErrorKey", () => {
  it("maps stable API error codes to translated keys", () => {
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.UNAUTHORIZED } })).toBe(
      "unauthorized",
    );
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.FORBIDDEN } })).toBe("forbidden");
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.TRACKING_NOT_FOUND } })).toBe(
      "notFound",
    );
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.IDEMPOTENCY_CONFLICT } })).toBe(
      "conflict",
    );
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.RATE_LIMIT_EXCEEDED } })).toBe(
      "rateLimited",
    );
    expect(getApiErrorKey({ data: { errorCode: ApiErrorCode.VALIDATION_ERROR } })).toBe(
      "validation",
    );
  });

  it("falls back to the HTTP status when no error code is present", () => {
    expect(getApiErrorKey({ status: 404 })).toBe("notFound");
    expect(getApiErrorKey({ status: 409 })).toBe("conflict");
    expect(getApiErrorKey({ status: 429 })).toBe("rateLimited");
    expect(getApiErrorKey({ status: 503 })).toBe("server");
  });

  it("reports network failures", () => {
    expect(getApiErrorKey({ status: "FETCH_ERROR" })).toBe("network");
    expect(getApiErrorKey({ status: "TIMEOUT_ERROR" })).toBe("network");
  });

  it("returns null for unrecognised values so the server message can be shown", () => {
    expect(getApiErrorKey(null)).toBeNull();
    expect(getApiErrorKey("boom")).toBeNull();
    expect(getApiErrorKey({ status: 400 })).toBeNull();
    expect(getApiErrorKey(new Error("x"))).toBeNull();
  });
});
