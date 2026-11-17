import {
  ApiErrorCode,
  type AddressParseV2Result,
  type RecipientFeatureSnapshot,
  type RecipientRiskSnapshot,
  type RtoFeatureSet,
  type RtoPredictionRecord,
} from "@dhruto/contracts";
import { NotFoundException } from "@nestjs/common";
import type { RecipientRiskSnapshot as RecipientRiskSnapshotEntity } from "../../database/entities/RecipientRiskSnapshot.entity.js";
import type { RtoPrediction as RtoPredictionEntity } from "../../database/entities/RtoPrediction.entity.js";

export function resolveConfirmationStructure(
  input: {
    candidateIndex?: number;
    manualStructure?: AddressParseV2Result["structuredAddress"];
  },
  candidatesJson: unknown,
): AddressParseV2Result["structuredAddress"] {
  if (input.manualStructure) {
    return input.manualStructure;
  }

  if (typeof input.candidateIndex === "number") {
    const candidates = candidatesJson as Array<{
      district: string;
      districtBn?: string;
      thana?: string;
      upazila?: string;
      division?: string;
    }>;
    const chosen = candidates[input.candidateIndex];
    if (!chosen) {
      throw new NotFoundException({
        message: "Candidate not found for this parse result",
        error: ApiErrorCode.ADDRESS_AMBIGUOUS,
      });
    }
    return {
      division: chosen.division ?? null,
      district: chosen.district,
      upazila: chosen.upazila ?? chosen.thana ?? null,
      thana: chosen.thana ?? null,
      union: null,
      ward: null,
      municipality: null,
      cityCorporation: null,
      village: null,
      area: null,
      road: null,
      house: null,
      building: null,
      flat: null,
      postalCode: null,
      landmark: null,
    };
  }

  throw new NotFoundException({
    message: "Provide a candidate index or a manual structure",
    error: ApiErrorCode.ADDRESS_AMBIGUOUS,
  });
}

export function buildRtoFeatureSet(
  parcel: { codAmount: string | number },
  platformFeatures: RecipientFeatureSnapshot,
  addressConfidence: number,
): RtoFeatureSet {
  const total = platformFeatures.totalOrders;
  const codTotal = platformFeatures.codCollectedMinor + platformFeatures.codFailedMinor;
  return {
    deliverySuccessRate: total > 0 ? platformFeatures.deliveredOrders / total : 0,
    rtoRate: total > 0 ? platformFeatures.returnedOrders / total : 0,
    codFailureRate: codTotal > 0 ? platformFeatures.codFailedMinor / codTotal : 0,
    recentOrderCount: platformFeatures.recentOrderCount,
    recentFailureCount: platformFeatures.recentFailedDeliveries,
    addressConfidence,
    codAmountMinor: Math.round(Number(parcel.codAmount) * 100),
    featureVersion: platformFeatures.featureVersion,
  };
}

export function resolveTerminalParcelOutcome(parcelStatus: string): "DELIVERED" | "RTO" | null {
  if (["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"].includes(parcelStatus)) {
    return "DELIVERED";
  }
  if (["RTO_INITIATED", "RETURN_IN_TRANSIT", "RETURNED_TO_MERCHANT", "CANCELLED"].includes(parcelStatus)) {
    return "RTO";
  }
  return null;
}

export function mapRiskSnapshotResponse(snapshot: RecipientRiskSnapshotEntity): RecipientRiskSnapshot {
  return {
    id: snapshot.id,
    phoneHash: snapshot.phoneHash,
    merchantId: snapshot.merchantId,
    scope: snapshot.scope as "PLATFORM" | "MERCHANT",
    riskScore: snapshot.riskScore,
    level: snapshot.level as never,
    reasons: snapshot.reasons as never,
    riskConfidence: snapshot.riskConfidence as never,
    scoringVersion: snapshot.scoringVersion,
    featureSnapshot: snapshot.features as never,
    scoredAt: snapshot.scoredAt.toISOString(),
  };
}

export function mapRtoPredictionResponse(prediction: RtoPredictionEntity): RtoPredictionRecord {
  return {
    id: prediction.id,
    parcelId: prediction.parcelId,
    phoneHash: prediction.phoneHash,
    score: prediction.score,
    level: prediction.level as never,
    reasons: prediction.reasons as never,
    modelType: prediction.modelType as never,
    modelVersion: prediction.modelVersion,
    features: prediction.features as never,
    predictedAt: prediction.predictedAt.toISOString(),
    outcome: prediction.outcome as never,
    outcomeAt: prediction.outcomeAt?.toISOString() ?? null,
  };
}
