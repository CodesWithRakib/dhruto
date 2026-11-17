import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ApiErrorCode,
  type AddressParseV2Request,
  type AddressParseV2Result,
  type AddressConfirmationRecord,
  type ConfirmationSource,
  type IntelligenceRecommendation,
  type RecipientRiskSnapshot,
  type RtoPredictionRecord,
} from "@dhruto/contracts";
import { Parcel } from "../../database/entities/Parcel.entity.js";
import { AddressParse } from "../../database/entities/AddressParse.entity.js";
import { AddressConfirmation } from "../../database/entities/AddressConfirmation.entity.js";
import { RtoPrediction } from "../../database/entities/RtoPrediction.entity.js";
import { AddressIntelligenceService } from "./address-intelligence.service.js";
import { RecipientFeaturesService } from "./recipient-features.service.js";
import { RiskEngineService } from "./risk-engine.service.js";
import { RuleBasedRtoEngine } from "./rto-engine.service.js";
import { RecommendationEngineService } from "./recommendation.service.js";
import { canonicalPhone, hashPhone, isValidBangladeshPhone } from "../common/phone-hash.util.js";
import { getErrorMessage } from "../../common/utils/error.util.js";
import {
  resolveConfirmationStructure,
  buildRtoFeatureSet,
  resolveTerminalParcelOutcome,
  mapRiskSnapshotResponse,
  mapRtoPredictionResponse,
} from "./intelligence-facade.helper.js";

/**
 * Phase 6 orchestration facade: address confirm/correct, parcel-scoped risk /
 * RTO / recommendations.
 *
 * Advisory only — every method reads or records intelligence state; none
 * mutates parcels, wallets, settlements or payouts.
 */
@Injectable()
export class IntelligenceFacadeService {
  private readonly logger = new Logger(IntelligenceFacadeService.name);

  constructor(
    private readonly addresses: AddressIntelligenceService,
    private readonly features: RecipientFeaturesService,
    private readonly risk: RiskEngineService,
    private readonly rtoEngine: RuleBasedRtoEngine,
    private readonly recommendations: RecommendationEngineService,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(AddressParse)
    private readonly parseRepo: Repository<AddressParse>,
    @InjectRepository(AddressConfirmation)
    private readonly confirmationRepo: Repository<AddressConfirmation>,
    @InjectRepository(RtoPrediction)
    private readonly predictionRepo: Repository<RtoPrediction>,
  ) {}

  async parseAddressV2(
    req: AddressParseV2Request,
    opts?: { parcelId?: string },
  ): Promise<AddressParseV2Result> {
    return this.addresses.parse(req.rawAddress, {
      districtHint: req.districtHint,
      maxCandidates: req.maxCandidates,
      parcelId: opts?.parcelId,
    });
  }

  async confirmAddress(
    parseId: string,
    input: {
      candidateIndex?: number;
      manualStructure?: AddressParseV2Result["structuredAddress"];
      reason?: string;
    },
    actorId: string,
    source: ConfirmationSource,
    parcelId?: string,
  ): Promise<AddressConfirmationRecord> {
    const parse = await this.parseRepo.findOne({ where: { id: parseId } });
    if (!parse) {
      throw new NotFoundException({
        message: "Address parse not found",
        error: ApiErrorCode.ADDRESS_PARSE_FAILED,
      });
    }

    const structure = resolveConfirmationStructure(input, parse.candidates);

    const row = await this.confirmationRepo.save(
      this.confirmationRepo.create({
        parseId,
        parcelId: parcelId ?? parse.parcelId,
        confirmedBy: actorId,
        confirmationSource: source,
        structure: structure as unknown as Record<string, unknown>,
        candidateIndex: input.candidateIndex ?? null,
        reason: input.reason ?? null,
      }),
    );
    this.logger.log(`ADDRESS_CONFIRMED parse=${parseId} actor=${actorId} source=${source}`);
    return {
      id: row.id,
      parseId,
      confirmedBy: actorId,
      confirmedAt: row.createdAt.toISOString(),
      confirmationSource: source,
      structure,
    };
  }

  /** Parcel-scoped view with ownership check (merchant sees own parcels). */
  async parcelIntelligence(
    parcelId: string,
    scope: { merchantId?: string; role: string },
  ): Promise<{
    parcelId: string;
    trackingCode: string;
    address: AddressParseV2Result;
    risk: RecipientRiskSnapshot;
    rto: RtoPredictionRecord;
    recommendations: IntelligenceRecommendation[];
  }> {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel || (scope.merchantId && parcel.merchantId !== scope.merchantId)) {
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }

    const canonical = canonicalPhone(parcel.recipientPhone);
    const phoneHash = hashPhone(parcel.recipientPhone);
    const asOf = new Date();
    const address = await this.addresses.parse(parcel.rawAddress, {
      districtHint: parcel.district ?? undefined,
      parcelId: parcel.id,
    });

    const platformFeatures = await this.features.build({
      phoneHash,
      phoneTail: canonical.slice(-9),
      scope: "PLATFORM",
      asOf,
      addressConfidence: address.confidence,
    });
    const snapshot = await this.risk.scoreAndPersist(platformFeatures);

    // Merchant-specific companion snapshot (same phone, merchant scope).
    const merchantFeatures = await this.features.build({
      phoneHash,
      phoneTail: canonical.slice(-9),
      merchantId: parcel.merchantId,
      scope: "MERCHANT",
      asOf,
      addressConfidence: address.confidence,
    });
    await this.risk
      .scoreAndPersist(merchantFeatures)
      .catch((error: unknown) =>
        this.logger.warn(`Merchant risk snapshot failed: ${getErrorMessage(error, "unknown")}`),
      );

    const rtoFeatures = buildRtoFeatureSet(parcel, platformFeatures, address.confidence);
    const rtoResult = this.rtoEngine.predict(rtoFeatures);
    let prediction = await this.predictionRepo.findOne({ where: { parcelId } });
    if (!prediction) {
      prediction = await this.predictionRepo.save(
        this.predictionRepo.create({
          parcelId,
          phoneHash,
          merchantId: parcel.merchantId,
          score: rtoResult.score,
          level: rtoResult.level,
          reasons: rtoResult.reasons as unknown as Record<string, unknown>[],
          modelType: this.rtoEngine.modelType,
          modelVersion: this.rtoEngine.modelVersion,
          features: rtoFeatures as unknown as Record<string, unknown>,
          predictedAt: new Date(),
          outcome: null,
          outcomeAt: null,
        }),
      );
    } else if (prediction.outcome === null) {
      const terminal = resolveTerminalParcelOutcome(parcel.status);
      if (terminal) {
        prediction.outcome = terminal;
        prediction.outcomeAt = new Date();
        prediction = await this.predictionRepo.save(prediction);
      }
    }

    const recItems = this.recommendations.recommend({
      risk: {
        score: snapshot.riskScore,
        level: snapshot.level as never,
        reasons: snapshot.reasons as never,
      },
      rto: { score: rtoResult.score, level: rtoResult.level },
      address: {
        confidence: address.confidence,
        requiresConfirmation: address.requiresConfirmation,
      },
    });
    const recommendations = await this.recommendations.persistForParcel(
      parcelId,
      prediction.id,
      recItems,
    );

    return {
      parcelId,
      trackingCode: parcel.trackingCode,
      address,
      risk: mapRiskSnapshotResponse(snapshot),
      rto: mapRtoPredictionResponse(prediction),
      recommendations,
    };
  }

  phoneValidity(phone: string): { canonical: string; valid: boolean } {
    return { canonical: canonicalPhone(phone), valid: isValidBangladeshPhone(phone) };
  }
}
