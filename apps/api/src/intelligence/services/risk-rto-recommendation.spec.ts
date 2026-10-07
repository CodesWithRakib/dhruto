import { describe, it, expect } from "vitest";
import { RiskEngineService } from "./risk-engine.service.js";
import { RuleBasedRtoEngine } from "./rto-engine.service.js";
import { RecommendationEngineService } from "./recommendation.service.js";
import {
  FEATURE_VERSION,
  RecommendationAction,
  RiskLevel,
  type RecipientFeatureSnapshot,
} from "@dhruto/contracts";

function features(overrides: Partial<RecipientFeatureSnapshot> = {}): RecipientFeatureSnapshot {
  return {
    phoneHash: "hash",
    merchantId: null,
    scope: "PLATFORM",
    asOf: new Date().toISOString(),
    totalOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    failedAttempts: 0,
    recentFailedDeliveries: 0,
    codCollectedMinor: 0,
    codFailedMinor: 0,
    recentOrderCount: 0,
    addressConfidence: null,
    featureVersion: FEATURE_VERSION,
    ...overrides,
  };
}

describe("risk engine (rule-risk-v1)", () => {
  const engine = new RiskEngineService({} as never, {} as never);

  it("cold start yields UNKNOWN with LOW confidence (new != risky)", () => {
    const out = engine.score(features({ totalOrders: 0 }));
    expect(out.level).toBe(RiskLevel.UNKNOWN);
    expect(out.riskConfidence).toBe("LOW");
    expect(out.reasons[0]?.code).toBe("INSUFFICIENT_HISTORY");
  });

  it("flags heavy RTO history as HIGH with reason codes", () => {
    const out = engine.score(
      features({ totalOrders: 5, deliveredOrders: 1, returnedOrders: 4, recentFailedDeliveries: 3, recentOrderCount: 4 }),
    );
    expect(out.level).toBe(RiskLevel.HIGH);
    expect(out.score).toBeGreaterThanOrEqual(70);
    expect(out.reasons.map((r) => r.code)).toContain("HIGH_RTO_HISTORY");
    expect(out.reasons.map((r) => r.code)).toContain("MULTIPLE_RECENT_FAILED_DELIVERIES");
  });

  it("rewards proven buyers with LOW risk", () => {
    const out = engine.score(
      features({ totalOrders: 4, deliveredOrders: 4, returnedOrders: 0, recentOrderCount: 1 }),
    );
    expect(out.level).toBe(RiskLevel.LOW);
  });

  it("separates merchant scope (concentrated returns add merchant risk)", () => {
    const platform = engine.score(
      features({ totalOrders: 4, deliveredOrders: 2, returnedOrders: 2, scope: "PLATFORM" }),
    );
    const merchant = engine.score(
      features({ totalOrders: 4, deliveredOrders: 2, returnedOrders: 2, scope: "MERCHANT" }),
    );
    expect(merchant.score).toBeGreaterThanOrEqual(platform.score);
    expect(merchant.reasons.map((r) => r.code)).toContain("MERCHANT_SPECIFIC_RISK");
  });

  it("clamps scores to 0..100 with meaningful confidence", () => {
    const out = engine.score(
      features({ totalOrders: 20, deliveredOrders: 0, returnedOrders: 20, recentFailedDeliveries: 10, recentOrderCount: 12 }),
    );
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.riskConfidence).toBe("HIGH");
  });

  it("uses no sensitive personal characteristics", () => {
    const out = engine.score(features({ totalOrders: 3, deliveredOrders: 1, returnedOrders: 2 }));
    const blob = JSON.stringify(out);
    expect(blob).not.toMatch(/religion|ethnicity|politic|health|gender|race/i);
  });
});

describe("rule-based RTO engine", () => {
  const engine = new RuleBasedRtoEngine();

  it("cold start is UNKNOWN (not high)", () => {
    const out = engine.predict({
      deliverySuccessRate: 0,
      rtoRate: 0,
      codFailureRate: 0,
      recentOrderCount: 0,
      recentFailureCount: 0,
      addressConfidence: null,
      codAmountMinor: 200000,
      featureVersion: FEATURE_VERSION,
    });
    expect(out.level).toBe("UNKNOWN");
  });

  it("high return history predicts HIGH with reasons", () => {
    const out = engine.predict({
      deliverySuccessRate: 0.2,
      rtoRate: 0.8,
      codFailureRate: 0.6,
      recentOrderCount: 5,
      recentFailureCount: 4,
      addressConfidence: 0.4,
      codAmountMinor: 1200000,
      featureVersion: FEATURE_VERSION,
    });
    expect(out.level).toBe("HIGH");
    expect(out.reasons.length).toBeGreaterThan(0);
  });

  it("exposes model type + version for reproducibility", () => {
    expect(engine.modelType).toBe("RULE_BASED");
    expect(engine.modelVersion).toBe("rule-based-rto-v1");
  });
});

describe("recommendation engine (advisory)", () => {
  const engine = new RecommendationEngineService({} as never);

  it("recommends address verification for low-confidence addresses", () => {
    const out = engine.recommend({
      risk: { score: 20, level: RiskLevel.LOW, reasons: [] },
      rto: { score: 20, level: "LOW" },
      address: { confidence: 0.3, requiresConfirmation: true },
    });
    expect(out.map((r) => r.action)).toContain(RecommendationAction.VERIFY_ADDRESS);
  });

  it("escalates HIGH risk to review + call + prepaid", () => {
    const out = engine.recommend({
      risk: { score: 85, level: RiskLevel.HIGH, reasons: [] },
      rto: { score: 80, level: "HIGH" },
      address: { confidence: 0.9, requiresConfirmation: false },
    });
    const actions = out.map((r) => r.action);
    expect(actions).toContain(RecommendationAction.MANUAL_REVIEW);
    expect(actions).toContain(RecommendationAction.CALL_CUSTOMER);
    expect(actions).toContain(RecommendationAction.SUGGEST_PREPAID);
  });

  it("stays quiet for clean low-risk bookings", () => {
    const out = engine.recommend({
      risk: { score: 10, level: RiskLevel.LOW, reasons: [] },
      rto: { score: 12, level: "LOW" },
      address: { confidence: 0.95, requiresConfirmation: false },
    });
    expect(out).toEqual([]);
  });
});
