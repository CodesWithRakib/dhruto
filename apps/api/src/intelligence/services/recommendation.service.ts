import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RecommendationAction,
  type IntelligenceRecommendation,
  type RecommendationEngine,
  type RiskLevel,
  type RiskReason,
  type RtoPredictionLevel,
} from "@dhruto/contracts";
import { IntelligenceRecommendation as RecommendationRow } from "../../database/entities/IntelligenceRecommendation.entity.js";
import { getErrorMessage } from "../../common/utils/error.util.js";

/**
 * Advisory recommendation rules.
 *
 * Every recommendation carries structured reasons and is advisory by default:
 * persisting one never mutates parcel, finance or delivery state. Overrides
 * (proceed/hold + reason + actor) are audited on the same row.
 */
@Injectable()
export class RecommendationEngineService implements RecommendationEngine {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(
    @InjectRepository(RecommendationRow)
    private readonly recommendationRepo: Repository<RecommendationRow>,
  ) {}

  recommend(input: {
    risk: { score: number; level: RiskLevel; reasons: RiskReason[] };
    rto: { score: number; level: RtoPredictionLevel };
    address: { confidence: number; requiresConfirmation: boolean };
  }): Array<{ action: RecommendationAction; reasons: RiskReason[] }> {
    const out: Array<{ action: RecommendationAction; reasons: RiskReason[] }> = [];
    const riskReasons = input.risk.reasons;

    if (input.address.requiresConfirmation) {
      out.push({
        action: RecommendationAction.VERIFY_ADDRESS,
        reasons: [
          {
            code: "VAGUE_DELIVERY_ADDRESS",
            detail:
              "Address confidence is low or the destination is ambiguous — confirm before dispatch.",
          },
        ],
      });
    }
    if (input.risk.level === "HIGH" || input.rto.level === "HIGH") {
      out.push({ action: RecommendationAction.MANUAL_REVIEW, reasons: riskReasons });
      out.push({ action: RecommendationAction.CALL_CUSTOMER, reasons: riskReasons });
    } else if (input.risk.level === "MEDIUM" || input.rto.level === "MEDIUM") {
      out.push({ action: RecommendationAction.REVIEW_BEFORE_DISPATCH, reasons: riskReasons });
    }
    if (input.risk.level === "HIGH") {
      out.push({ action: RecommendationAction.SUGGEST_PREPAID, reasons: riskReasons });
    }
    return out;
  }

  async persistForParcel(
    parcelId: string,
    predictionId: string | null,
    items: Array<{ action: RecommendationAction; reasons: RiskReason[] }>,
  ): Promise<IntelligenceRecommendation[]> {
    const saved: IntelligenceRecommendation[] = [];
    for (const item of items) {
      try {
        const row = await this.recommendationRepo.save(
          this.recommendationRepo.create({
            parcelId,
            predictionId,
            action: item.action,
            reasons: item.reasons as unknown as Record<string, unknown>[],
            status: "ACTIVE",
          }),
        );
        saved.push(this.toContract(row));
      } catch (error) {
        this.logger.warn(`Recommendation persist failed: ${getErrorMessage(error, "unknown")}`);
      }
    }
    return saved;
  }

  async override(
    id: string,
    actorId: string,
    decision: "PROCEED" | "HOLD",
    reason: string,
  ): Promise<IntelligenceRecommendation> {
    const row = await this.recommendationRepo.findOne({ where: { id } });
    if (!row) {
      throw Object.assign(new Error("Recommendation not found"), {
        status: 404,
        error: "RECOMMENDATION_NOT_FOUND",
      });
    }
    row.status = "OVERRIDDEN";
    row.overriddenBy = actorId;
    row.overriddenAt = new Date();
    row.overrideReason = reason;
    row.overrideDecision = decision;
    const saved = await this.recommendationRepo.save(row);
    this.logger.log(`RECOMMENDATION_OVERRIDDEN id=${id} decision=${decision} actor=${actorId}`);
    return this.toContract(saved);
  }

  async setStatus(id: string, status: "ACCEPTED" | "DISMISSED"): Promise<void> {
    await this.recommendationRepo.update({ id }, { status });
  }

  private toContract(row: RecommendationRow): IntelligenceRecommendation {
    return {
      id: row.id,
      parcelId: row.parcelId,
      predictionId: row.predictionId,
      action: row.action as RecommendationAction,
      reasons: row.reasons as unknown as IntelligenceRecommendation["reasons"],
      status: row.status as IntelligenceRecommendation["status"],
      overriddenBy: row.overriddenBy,
      overriddenAt: row.overriddenAt?.toISOString() ?? null,
      overrideReason: row.overrideReason,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
