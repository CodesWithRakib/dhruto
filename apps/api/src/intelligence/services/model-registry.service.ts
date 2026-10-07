import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual, IsNull } from "typeorm";
import type { IntelligenceFeedbackInput, ScoringModelRecord } from "@dhruto/contracts";
import { IntelligenceFeedback } from "../../database/entities/IntelligenceFeedback.entity.js";
import { ScoringModel } from "../../database/entities/ScoringModel.entity.js";
import { AddressParse } from "../../database/entities/AddressParse.entity.js";
import { AddressConfirmation } from "../../database/entities/AddressConfirmation.entity.js";
import { RecipientRiskSnapshot } from "../../database/entities/RecipientRiskSnapshot.entity.js";
import { RtoPrediction } from "../../database/entities/RtoPrediction.entity.js";
import { IntelligenceRecommendation } from "../../database/entities/IntelligenceRecommendation.entity.js";

/** Clean feedback capture (stored, never auto-trained on). */
@Injectable()
export class IntelligenceFeedbackService {
  constructor(
    @InjectRepository(IntelligenceFeedback)
    private readonly feedbackRepo: Repository<IntelligenceFeedback>,
  ) {}

  async record(input: IntelligenceFeedbackInput, actorId?: string): Promise<IntelligenceFeedback> {
    const existing = await this.feedbackRepo.findOne({
      where: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        signal: input.signal,
        actorId: actorId ?? IsNull(),
      },
    });
    if (existing) return existing;
    return this.feedbackRepo.save(
      this.feedbackRepo.create({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        signal: input.signal,
        actorId: actorId ?? null,
        detail: input.detail ?? null,
      }),
    );
  }
}

/**
 * Scoring-model registry: exactly one ACTIVE row per name.
 * Activation/retirement is admin-only and audited via structured logs.
 */
@Injectable()
export class ModelRegistryService {
  constructor(
    @InjectRepository(ScoringModel)
    private readonly modelRepo: Repository<ScoringModel>,
    @InjectRepository(AddressParse)
    private readonly parseRepo: Repository<AddressParse>,
    @InjectRepository(AddressConfirmation)
    private readonly confirmationRepo: Repository<AddressConfirmation>,
    @InjectRepository(RecipientRiskSnapshot)
    private readonly riskRepo: Repository<RecipientRiskSnapshot>,
    @InjectRepository(RtoPrediction)
    private readonly predictionRepo: Repository<RtoPrediction>,
    @InjectRepository(IntelligenceRecommendation)
    private readonly recommendationRepo: Repository<IntelligenceRecommendation>,
  ) {}

  async ensureDefaults(): Promise<void> {
    const defaults = [
      { name: "address-parser", version: "address-parser-v1.0", type: "RULE_BASED" },
      { name: "recipient-risk", version: "rule-risk-v1", type: "RULE_BASED" },
      { name: "rto-predictor", version: "rule-based-rto-v1", type: "RULE_BASED" },
    ];
    for (const d of defaults) {
      const existing = await this.modelRepo.findOne({
        where: { name: d.name, version: d.version },
      });
      if (!existing) {
        await this.modelRepo.save(
          this.modelRepo.create({
            ...d,
            status: "ACTIVE",
            configuration: {},
            activatedAt: new Date(),
          }),
        );
      }
    }
  }

  async list(): Promise<ScoringModelRecord[]> {
    // Self-healing: a fresh database gets the baseline registry on first read.
    await this.ensureDefaults();
    const rows = await this.modelRepo.find({ order: { name: "ASC", createdAt: "DESC" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      type: r.type,
      status: r.status as ScoringModelRecord["status"],
      configuration: r.configuration,
      createdAt: r.createdAt.toISOString(),
      activatedAt: r.activatedAt?.toISOString() ?? null,
      retiredAt: r.retiredAt?.toISOString() ?? null,
    }));
  }

  async metrics(): Promise<{
    parses: number;
    lowConfidenceParses: number;
    confirmations: number;
    riskSnapshots: number;
    highRisk: number;
    predictions: number;
    outcomes: number;
    overrides: number;
  }> {
    const [
      parses,
      lowConfidenceParses,
      confirmations,
      riskSnapshots,
      highRisk,
      predictions,
      outcomes,
      overrides,
    ] = await Promise.all([
      this.parseRepo.count(),
      this.parseRepo.count({ where: { confidence: MoreThanOrEqual(0) } }).then(async (total) => {
        if (total === 0) return 0;
        return this.parseRepo
          .createQueryBuilder("p")
          .where("p.confidence < :t", { t: 0.5 })
          .getCount();
      }),
      this.confirmationRepo.count(),
      this.riskRepo.count(),
      this.riskRepo.count({ where: { level: "HIGH" } }),
      this.predictionRepo.count(),
      this.predictionRepo
        .createQueryBuilder("p")
        .where("p.outcome IS NOT NULL")
        .getCount(),
      this.recommendationRepo.count({ where: { status: "OVERRIDDEN" } }),
    ]);
    return {
      parses,
      lowConfidenceParses,
      confirmations,
      riskSnapshots,
      highRisk,
      predictions,
      outcomes,
      overrides,
    };
  }
}
