import { describe, it, expect } from "vitest";
import {
  classifyHttpStatus,
  classifyNetworkError,
  LogSmsProvider,
  LogEmailProvider,
} from "./providers.js";
import { PROVIDER_ERROR_CODES, ProviderErrorKind } from "@dhruto/contracts";

describe("provider abstraction", () => {
  describe("LogSmsProvider.normalizePhoneNumber (Bangladesh)", () => {
    const provider = new LogSmsProvider();

    it("keeps +880 format as-is", () => {
      expect(provider.normalizePhoneNumber("+8801712345678")).toBe("+8801712345678");
    });

    it("normalizes 880 prefix to +880", () => {
      expect(provider.normalizePhoneNumber("8801712345678")).toBe("+8801712345678");
    });

    it("normalizes local 01 prefix to +88", () => {
      expect(provider.normalizePhoneNumber("01712345678")).toBe("+8801712345678");
    });

    it("strips spaces, dashes and parentheses before normalizing", () => {
      expect(provider.normalizePhoneNumber("+880 17-1234 5678")).toBe("+8801712345678");
      expect(provider.normalizePhoneNumber("017-1234-5678")).toBe("+8801712345678");
    });
  });

  describe("log transports never perform network I/O", () => {
    it("log SMS succeeds with a provider message id", async () => {
      const provider = new LogSmsProvider();
      const result = await provider.sendSms("+8801712345678", "Hello");
      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBeTruthy();
      expect(result.provider).toBe("log");
    });

    it("log email succeeds with a provider message id", async () => {
      const provider = new LogEmailProvider();
      const result = await provider.sendEmail("merchant@example.com", "Subject", "Body");
      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBeTruthy();
    });
  });

  describe("classifyHttpStatus (retry classification)", () => {
    it("treats 429/408/5xx as transient", () => {
      expect(classifyHttpStatus(429).kind).toBe(ProviderErrorKind.TRANSIENT);
      expect(classifyHttpStatus(429).code).toBe(PROVIDER_ERROR_CODES.RATE_LIMITED);
      expect(classifyHttpStatus(408).kind).toBe(ProviderErrorKind.TRANSIENT);
      expect(classifyHttpStatus(500).kind).toBe(ProviderErrorKind.TRANSIENT);
      expect(classifyHttpStatus(503).code).toBe(PROVIDER_ERROR_CODES.WEBHOOK_5XX);
    });

    it("treats 4xx validation/auth failures as permanent (no infinite retry)", () => {
      expect(classifyHttpStatus(400).kind).toBe(ProviderErrorKind.PERMANENT);
      expect(classifyHttpStatus(404).kind).toBe(ProviderErrorKind.PERMANENT);
      expect(classifyHttpStatus(401).kind).toBe(ProviderErrorKind.PERMANENT);
      expect(classifyHttpStatus(401).code).toBe(PROVIDER_ERROR_CODES.AUTHENTICATION_FAILED);
      expect(classifyHttpStatus(403).code).toBe(PROVIDER_ERROR_CODES.AUTHENTICATION_FAILED);
    });
  });

  describe("classifyNetworkError", () => {
    it("maps timeouts to PROVIDER_TIMEOUT", () => {
      const mapped = classifyNetworkError(new Error("request timed out"));
      expect(mapped.kind).toBe(ProviderErrorKind.TRANSIENT);
      expect(mapped.code).toBe(PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT);
    });

    it("maps generic network failures to NETWORK_ERROR", () => {
      const mapped = classifyNetworkError(new Error("ECONNREFUSED"));
      expect(mapped.kind).toBe(ProviderErrorKind.TRANSIENT);
      expect(mapped.code).toBe(PROVIDER_ERROR_CODES.NETWORK_ERROR);
    });
  });

  describe("backoff calculation (exponential, capped)", () => {
    const backoffMs = (attempt: number): number =>
      Math.min(Math.pow(2, attempt) * 5000, 5 * 60 * 1000);

    it("grows exponentially and caps at 5 minutes", () => {
      expect(backoffMs(0)).toBe(5000);
      expect(backoffMs(1)).toBe(10000);
      expect(backoffMs(2)).toBe(20000);
      expect(backoffMs(10)).toBe(300000);
    });
  });
});
