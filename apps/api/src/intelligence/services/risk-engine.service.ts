import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import {
  DEFAULT_INTELLIGENCE_THRESHOLDS,
  RISK_SCORING_VERSION,
  RISK_REASON_CODES,
  RiskLevel,
  type RecipientFeatureSnapshot,
  type RiskConfidence,
  type RiskReason,
  type RiskScorerEngine,
} from "@dhruto/contracts";
import { RecipientRiskSnapshot } from "../../database/entities/RecipientRiskSnapshot.entity.js";
import { RecipientFeatureAggregate } from "../../database/entities/RecipientFeatureAggregate.entity.js";

/**
 * Transparent rule-based recipient risk scorer (v1).
 *
 * Logistics signals only — never religion, ethnicity, politics, health or any
 * other sensitive personal characteristic. Cold start yields UNKNOWN with LOW
 * confidence: lack of history is not evidence of risk.
 */
@Injectable()
export class RiskEngineService implements RiskScorerEngine {
  readonly scoringVersion = RISK_SCORING_VERSION;

  constructor(
    @InjectRepository(RecipientRiskSnapshot)
    private readonly snapshotRepo: Repository<RecipientRiskSnapshot>,
    @InjectRepository(RecipientFeatureAggregate)
    private readonly aggregateRepo: Repository<RecipientFeatureAggregate>,
  ) {}

  score(features: RecipientFeatureSnapshot): {
    score: number;
    level: RiskLevel;
    reasons: RiskReason[];
    riskConfidence: RiskConfidence;
  } {
    const t = DEFAULT_INTELLIGENCE_THRESHOLDS;
    const reasons: RiskReason[] = [];
    let score = 20;

    // Cold start: explicit UNKNOWN, never "new = risky".
    if (features.totalOrders === 0) {
      return {
        score: 20,
        level: RiskLevel.UNKNOWN,
        reasons: [
          {
            code: RISK_REASON_CODES.INSUFFICIENT_HISTORY,
            detail: "No prior delivery history for this recipient — treat as unrated.",
          },
        ],
        riskConfidence: "LOW",
      };
    }

    const total = features.totalOrders;
    const rtoRate = features.returnedOrders / total;
    const completionRate = features.deliveredOrders / total;
    const codTotal = features.codCollectedMinor + features.codFailedMinor;
    const codFailureRate = codTotal > 0 ? features.codFailedMinor / codTotal : 0;

    if (rtoRate >= 0.5 || features.returnedOrders >= 3) {
      const add = Math.min(45, 20 + Math.round(rtoRate * 40));
      score += add;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_RTO_HISTORY,
        detail: `${features.returnedOrders} return(s) in ${total} order(s) — elevated return pattern.`,
      });
    }
    if (features.recentFailedDeliveries >= 2) {
      score += 15;
      reasons.push({
        code: RISK_REASON_CODES.MULTIPLE_RECENT_FAILED_DELIVERIES,
        detail: `${features.recentFailedDeliveries} failed deliveries in the recent window.`,
      });
    }
    if (codFailureRate >= 0.5 && codTotal > 0) {
      score += 15;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_COD_FAILURE_RATE,
        detail: "Cash-on-delivery collection has failed repeatedly for this recipient.",
      });
    }
    if (completionRate < 0.5) {
      score += 10;
      reasons.push({
        code: RISK_REASON_CODES.LOW_DELIVERY_COMPLETION_RATE,
        detail: `Successful delivery rate is ${Math.round(completionRate * 100)}% across ${total} order(s).`,
      });
    }
    if (features.recentOrderCount >= t.velocityOrderCount) {
      score += 10;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_RECENT_ORDER_VELOCITY,
        detail: `${features.recentOrderCount} orders in the recent window — unusual ordering velocity.`,
      });
    }
    if (features.scope === "MERCHANT" && rtoRate >= 0.34 && total >= 3) {
      score += 5;
      reasons.push({
        code: RISK_REASON_CODES.MERCHANT_SPECIFIC_RISK,
        detail: "Return pattern is concentrated with your store specifically.",
      });
    }
    if (features.deliveredOrders >= 3 && features.returnedOrders === 0) {
      score = Math.max(0, score - 15);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level =
      score < t.riskLow ? RiskLevel.LOW : score < t.riskHigh ? RiskLevel.MEDIUM : RiskLevel.HIGH;
    const riskConfidence: RiskConfidence = total >= 5 ? "HIGH" : total >= 2 ? "MEDIUM" : "LOW";
    return { score, level, reasons, riskConfidence };
  }

  async scoreAndPersist(features: RecipientFeatureSnapshot): Promise<RecipientRiskSnapshot> {
    const { score, level, reasons, riskConfidence } = this.score(features);
    // Aggregate row is a rolling latest view (upsert); snapshots stay append-only.
    const existing = await this.aggregateRepo.findOne({
      where: {
        phoneHash: features.phoneHash,
        merchantId: features.merchantId ?? IsNull(),
      },
    });
    if (existing) {
      Object.assign(existing, {
        scope: features.scope,
        asOf: new Date(features.asOf),
        totalOrders: features.totalOrders,
        deliveredOrders: features.deliveredOrders,
        returnedOrders: features.returnedOrders,
        failedAttempts: features.failedAttempts,
        recentFailedDeliveries: features.recentFailedDeliveries,
        codCollectedMinor: features.codCollectedMinor,
        codFailedMinor: features.codFailedMinor,
        recentOrderCount: features.recentOrderCount,
        addressConfidence: features.addressConfidence,
        featureVersion: features.featureVersion,
        computedAt: new Date(),
      });
      await this.aggregateRepo.save(existing);
    } else {
      await this.aggregateRepo.save(
        this.aggregateRepo.create({
          phoneHash: features.phoneHash,
          merchantId: features.merchantId,
          scope: features.scope,
          asOf: new Date(features.asOf),
          totalOrders: features.totalOrders,
          deliveredOrders: features.deliveredOrders,
          returnedOrders: features.returnedOrders,
          failedAttempts: features.failedAttempts,
          recentFailedDeliveries: features.recentFailedDeliveries,
          codCollectedMinor: features.codCollectedMinor,
          codFailedMinor: features.codFailedMinor,
          recentOrderCount: features.recentOrderCount,
          addressConfidence: features.addressConfidence,
          featureVersion: features.featureVersion,
          computedAt: new Date(),
        }),
      );
    }
    return this.snapshotRepo.save(
      this.snapshotRepo.create({
        phoneHash: features.phoneHash,
        merchantId: features.merchantId,
        scope: features.scope,
        riskScore: score,
        level,
        reasons: reasons as unknown as Record<string, unknown>[],
        riskConfidence,
        scoringVersion: this.scoringVersion,
        features: features as unknown as Record<string, unknown>,
        scoredAt: new Date(),
      }),
    );
  }
}
