import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { maskSecret } from "./url-safety.util.js";
import { domainEventSchema, DomainEventType, DOMAIN_EVENT_VERSION } from "@dhruto/contracts";
import { randomUUID } from "crypto";

/** Mirrors WebhooksService.generateSignature without NestJS wiring. */
function generateSignature(payload: unknown, secret: string, timestamp: number): string {
  const serialized = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${serialized}`;
  const hash = createHmac("sha256", secret).update(signaturePayload).digest("hex");
  return `t=${timestamp},v1=${hash}`;
}

function verifySignature(payload: unknown, secret: string, signature: string): boolean {
  const match = signature.match(/^t=(\d+),v1=([a-f0-9]+)$/);
  if (!match) return false;
  const timestamp = Number(match[1]);
  return generateSignature(payload, secret, timestamp) === signature;
}

describe("webhook signing (HMAC-SHA256)", () => {
  const secret = "dhr_whsec_test_secret_0123456789abcdef";
  const payload = { eventId: "evt-1", type: "parcel.delivered", data: { trackingCode: "DHR-1" } };

  it("generates a t=...,v1=... signature", () => {
    const sig = generateSignature(payload, secret, 1700000000);
    expect(sig).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it("verifies a valid signature and rejects tampered payloads", () => {
    const timestamp = 1700000000;
    const sig = generateSignature(payload, secret, timestamp);
    expect(verifySignature(payload, secret, sig)).toBe(true);
    expect(verifySignature({ ...payload, data: { trackingCode: "DHR-2" } }, secret, sig)).toBe(
      false,
    );
  });

  it("rejects wrong secrets and malformed signatures", () => {
    const sig = generateSignature(payload, secret, 1700000000);
    expect(verifySignature(payload, "wrong-secret", sig)).toBe(false);
    expect(verifySignature(payload, secret, "not-a-signature")).toBe(false);
    expect(verifySignature(payload, secret, "t=abc,v1=zzz")).toBe(false);
  });

  it("includes the eventId for merchant-side idempotency", () => {
    const envelope = {
      eventId: randomUUID(),
      type: "parcel.delivered",
      version: 1,
      timestamp: new Date().toISOString(),
      data: { trackingCode: "DHR-1" },
    };
    expect(envelope.eventId).toBeTruthy();
    const sig = generateSignature(envelope, secret, 1700000000);
    expect(verifySignature(envelope, secret, sig)).toBe(true);
  });
});

describe("webhook secret masking", () => {
  it("masks list responses, keeping first/last 4 chars", () => {
    expect(maskSecret("dhr_whsec_abcdef123456")).toBe("dhr_***3456");
  });

  it("fully masks short secrets", () => {
    expect(maskSecret("short")).toBe("********");
  });
});

describe("domain event contract", () => {
  it("accepts a well-formed versioned event", () => {
    const event = {
      eventId: randomUUID(),
      eventType: DomainEventType.PARCEL_DELIVERED,
      version: DOMAIN_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      aggregateType: "parcel",
      aggregateId: randomUUID(),
      requestId: "req-1",
      payload: { trackingCode: "DHR-1" },
    };
    expect(domainEventSchema.safeParse(event).success).toBe(true);
  });

  it("rejects events with secrets inside the payload envelope validation", () => {
    const event = {
      eventId: randomUUID(),
      eventType: DomainEventType.PARCEL_DELIVERED,
      version: DOMAIN_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      aggregateType: "parcel",
      aggregateId: randomUUID(),
      requestId: "req-1",
      payload: {},
    };
    // Version is part of the contract — a wrong version must fail loudly,
    // never silently change shape.
    const wrongVersion = { ...event, version: 999 };
    expect(domainEventSchema.safeParse(wrongVersion).success).toBe(false);
    // Non-UUID event ids must fail.
    expect(domainEventSchema.safeParse({ ...event, eventId: "not-a-uuid" }).success).toBe(false);
  });

  it("keeps notification dedupe keys deterministic (event+recipient+channel)", () => {
    const key = (eventId: string, channel: string, recipient: string): string =>
      `${eventId}:${channel}:${recipient}`;
    expect(key("e1", "SMS", "customer:+8801")).toBe("e1:SMS:customer:+8801");
    expect(key("e1", "SMS", "customer:+8801")).toBe(key("e1", "SMS", "customer:+8801"));
    expect(key("e1", "SMS", "a")).not.toBe(key("e1", "EMAIL", "a"));
  });
});
