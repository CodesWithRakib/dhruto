import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DEFAULT_INTELLIGENCE_THRESHOLDS,
  RTO_MODEL_TYPE,
  RTO_MODEL_VERSION,
  RISK_REASON_CODES,
  type RiskReason,
  type RtoFeatureSet,
  type RtoPredictionLevel,
  type RtoPredictorEngine,
} from "@dhruto/contracts";
import { RtoPrediction } from "../../database/entities/RtoPrediction.entity.js";

/**
 * Rule-based RTO baseline behind the `RtoPredictorEngine` interface.
 *
 * Output is a heuristic score (0-100) + level — deliberately NOT presented as
 * a calibrated probability. A future `MlBasedRtoEngine` can replace this
 * class without touching the API or frontend: both speak the same interface
 * and versions are recorded per prediction.
 */
@Injectable()
export class RuleBasedRtoEngine implements RtoPredictorEngine {
  readonly modelType = RTO_MODEL_TYPE;
  readonly modelVersion = RTO_MODEL_VERSION;

  predict(features: RtoFeatureSet): {
    score: number;
    level: RtoPredictionLevel;
    reasons: RiskReason[];
  } {
    const t = DEFAULT_INTELLIGENCE_THRESHOLDS;
    const reasons: RiskReason[] = [];
    let score = 15;

    if (features.rtoRate >= 0.5 || features.recentFailureCount >= 3) {
      score += 35;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_RTO_HISTORY,
        detail: "Recipient return history indicates elevated RTO tendency.",
      });
    } else if (features.rtoRate >= 0.25) {
      score += 18;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_RTO_HISTORY,
        detail: "Recipient has a moderate return history.",
      });
    }
    if (features.deliverySuccessRate < 0.5 && features.recentOrderCount > 0) {
      score += 15;
      reasons.push({
        code: RISK_REASON_CODES.LOW_DELIVERY_COMPLETION_RATE,
        detail: `Historical delivery success is ${Math.round(features.deliverySuccessRate * 100)}%.`,
      });
    }
    if (features.codFailureRate >= 0.5) {
      score += 12;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_COD_FAILURE_RATE,
        detail: "COD collection has failed repeatedly for this recipient.",
      });
    }
    if (features.recentOrderCount >= t.velocityOrderCount) {
      score += 8;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_RECENT_ORDER_VELOCITY,
        detail: "Unusually high recent ordering velocity.",
      });
    }
    if (features.addressConfidence !== null && features.addressConfidence < 0.5) {
      score += 10;
      reasons.push({
        code: RISK_REASON_CODES.VAGUE_DELIVERY_ADDRESS,
        detail: "Delivery address confidence is low — failed handoff is more likely.",
      });
    }
    if (features.codAmountMinor >= t.highCodMinor) {
      score += 8;
      reasons.push({
        code: RISK_REASON_CODES.HIGH_COD_VALUE,
        detail: "High COD value increases doorstep refusal likelihood.",
      });
    }
    if (features.recentOrderCount === 0) {
      // Cold start: insufficient data, not high risk.
      return { score: 15, level: "UNKNOWN", reasons: [] };
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level: RtoPredictionLevel =
      score < t.rtoLow ? "LOW" : score < t.rtoHigh ? "MEDIUM" : "HIGH";
    return { score, level, reasons };
  }
}

const TERMINAL_DELIVERED = new Set(["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"]);
const TERMINAL_RTO = new Set([
  "RTO_INITIATED",
  "RETURN_IN_TRANSIT",
  "RETURNED_TO_MERCHANT",
  "CANCELLED",
]);

/** Persistence + outcome labeling for predictions (thin wrapper, no math). */
@Injectable()
export class RtoPredictionService {
  constructor(
    @InjectRepository(RtoPrediction)
    private readonly predictionRepo: Repository<RtoPrediction>,
  ) {}

  async recordOutcome(parcelId: string, parcelStatus: string): Promise<void> {
    const prediction = await this.predictionRepo.findOne({ where: { parcelId } });
    if (!prediction || prediction.outcome !== null) return;
    if (TERMINAL_DELIVERED.has(parcelStatus)) {
      prediction.outcome = "DELIVERED";
      prediction.outcomeAt = new Date();
      await this.predictionRepo.save(prediction);
    } else if (TERMINAL_RTO.has(parcelStatus)) {
      prediction.outcome = "RTO";
      prediction.outcomeAt = new Date();
      await this.predictionRepo.save(prediction);
    }
  }
}
