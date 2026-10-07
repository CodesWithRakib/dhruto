import { z } from "zod";
import { DeliveryZone } from "../parcel/parcel.schema.js";

/* ------------------------------------------------------------------ */
/* Versioning                                                          */
/* ------------------------------------------------------------------ */

/** Address parser implementation version. Bump on logic changes. */
export const ADDRESS_PARSER_VERSION = "address-parser-v1.0" as const;
/** Geography dataset version shipped with this release. */
export const GEO_DATASET_VERSION = "bd-geo-2026-10" as const;
/** Rule-based risk scoring version. */
export const RISK_SCORING_VERSION = "rule-risk-v1" as const;
/** Rule-based RTO prediction model version. */
export const RTO_MODEL_VERSION = "rule-based-rto-v1" as const;
export const RTO_MODEL_TYPE = "RULE_BASED" as const;
/** Feature aggregation version. */
export const FEATURE_VERSION = "features-v1" as const;

/* ------------------------------------------------------------------ */
/* Address match method + confidence                                   */
/* ------------------------------------------------------------------ */

export enum AddressMatchMethod {
  EXACT = "EXACT",
  ALIAS = "ALIAS",
  NORMALIZED = "NORMALIZED",
  FUZZY = "FUZZY",
  HIERARCHY_INFERRED = "HIERARCHY_INFERRED",
  MANUAL = "MANUAL",
}

export const addressConfidenceThresholdsSchema = z.object({
  high: z.number().min(0).max(1).default(0.95),
  good: z.number().min(0).max(1).default(0.75),
  confirm: z.number().min(0).max(1).default(0.5),
});

export type AddressConfidenceThresholds = z.infer<typeof addressConfidenceThresholdsSchema>;

/** Default thresholds: >=0.95 high, >=0.75 good, >=0.50 needs confirmation. */
export const DEFAULT_CONFIDENCE_THRESHOLDS: AddressConfidenceThresholds = {
  high: 0.95,
  good: 0.75,
  confirm: 0.5,
};

/* ------------------------------------------------------------------ */
/* Structured address (v2)                                             */
/* ------------------------------------------------------------------ */

export const structuredAddressSchema = z.object({
  division: z.string().nullable().default(null),
  district: z.string().nullable().default(null),
  upazila: z.string().nullable().default(null),
  thana: z.string().nullable().default(null),
  union: z.string().nullable().default(null),
  ward: z.string().nullable().default(null),
  municipality: z.string().nullable().default(null),
  cityCorporation: z.string().nullable().default(null),
  village: z.string().nullable().default(null),
  area: z.string().nullable().default(null),
  road: z.string().nullable().default(null),
  house: z.string().nullable().default(null),
  building: z.string().nullable().default(null),
  flat: z.string().nullable().default(null),
  postalCode: z.string().nullable().default(null),
  landmark: z.string().nullable().default(null),
});

export type StructuredAddress = z.infer<typeof structuredAddressSchema>;

export const addressCandidateSchema = z.object({
  placeId: z.string().uuid().nullable().default(null),
  district: z.string(),
  districtBn: z.string().nullable().default(null),
  upazila: z.string().nullable().default(null),
  thana: z.string().nullable().default(null),
  division: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1),
  matchedBy: z.nativeEnum(AddressMatchMethod),
  hasConflict: z.boolean().default(false),
});

export type AddressCandidate = z.infer<typeof addressCandidateSchema>;

export const addressParseV2RequestSchema = z.object({
  rawAddress: z.string().min(3, "Address must be at least 3 characters").max(500),
  districtHint: z.string().max(100).optional(),
  includeCandidates: z.boolean().optional().default(true),
  maxCandidates: z.number().int().min(1).max(10).optional().default(5),
});

export type AddressParseV2Request = z.infer<typeof addressParseV2RequestSchema>;

export interface AddressParseV2Result {
  /** Persisted parse row id (for the confirm workflow). Absent on cache-only reads. */
  parseId?: string;
  originalAddress: string;
  normalizedAddress: string;
  structuredAddress: StructuredAddress;
  /** 0.00 - 1.00 meaningful confidence (not fake precision). */
  confidence: number;
  matchedBy: AddressMatchMethod;
  hasConflict: boolean;
  conflictDetail: string | null;
  parserVersion: string;
  datasetVersion: string;
  language: "EN" | "BN" | "MIXED";
  candidates: AddressCandidate[];
  /** True when a human must confirm (low confidence or ambiguous). */
  requiresConfirmation: boolean;
}

export const addressConfirmRequestSchema = z.object({
  parseId: z.string().uuid(),
  /** Chosen candidate index, or a manual structure when nothing fits. */
  candidateIndex: z.number().int().min(0).max(9).optional(),
  manualStructure: structuredAddressSchema.optional(),
  reason: z.string().max(500).optional(),
});

export type AddressConfirmRequest = z.infer<typeof addressConfirmRequestSchema>;

export type ConfirmationSource = "merchant" | "operator" | "admin" | "system";

export interface AddressConfirmationRecord {
  id: string;
  parseId: string;
  confirmedBy: string;
  confirmedAt: string;
  confirmationSource: ConfirmationSource;
  structure: StructuredAddress;
}

/* ------------------------------------------------------------------ */
/* Geography dataset                                                   */
/* ------------------------------------------------------------------ */

export enum GeoPlaceKind {
  DIVISION = "DIVISION",
  DISTRICT = "DISTRICT",
  UPAZILA = "UPAZILA",
}

export type GeoAliasType =
  | "spelling_variant"
  | "abbreviation"
  | "transliteration"
  | "historical_name"
  | "common_usage";

export interface GeoDatasetVersionInfo {
  version: string;
  source: string;
  importedAt: string;
  divisions: number;
  districts: number;
  upazilas: number;
  aliases: number;
  status: "ACTIVE" | "SUPERSEDED";
}

/* ------------------------------------------------------------------ */
/* Recipient risk (v2)                                                 */
/* ------------------------------------------------------------------ */

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  UNKNOWN = "UNKNOWN",
}

export type RiskConfidence = "HIGH" | "MEDIUM" | "LOW";

export const RISK_REASON_CODES = {
  HIGH_RTO_HISTORY: "HIGH_RTO_HISTORY",
  MULTIPLE_RECENT_FAILED_DELIVERIES: "MULTIPLE_RECENT_FAILED_DELIVERIES",
  HIGH_COD_FAILURE_RATE: "HIGH_COD_FAILURE_RATE",
  LOW_DELIVERY_COMPLETION_RATE: "LOW_DELIVERY_COMPLETION_RATE",
  HIGH_RECENT_ORDER_VELOCITY: "HIGH_RECENT_ORDER_VELOCITY",
  MERCHANT_SPECIFIC_RISK: "MERCHANT_SPECIFIC_RISK",
  INSUFFICIENT_HISTORY: "INSUFFICIENT_HISTORY",
  INVALID_PHONE_FORMAT: "INVALID_PHONE_FORMAT",
  FIRST_TIME_RECIPIENT: "FIRST_TIME_RECIPIENT",
  VAGUE_DELIVERY_ADDRESS: "VAGUE_DELIVERY_ADDRESS",
  HIGH_COD_VALUE: "HIGH_COD_VALUE",
} as const;

export type RiskReasonCode = (typeof RISK_REASON_CODES)[keyof typeof RISK_REASON_CODES];

export interface RiskReason {
  code: RiskReasonCode;
  /** Human-safe explanation (no raw PII, no model internals). */
  detail: string;
}

/** Point-in-time feature values used for a score (reproducibility). */
export interface RecipientFeatureSnapshot {
  phoneHash: string;
  merchantId: string | null;
  scope: "PLATFORM" | "MERCHANT";
  asOf: string;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  failedAttempts: number;
  recentFailedDeliveries: number;
  codCollectedMinor: number;
  codFailedMinor: number;
  recentOrderCount: number;
  addressConfidence: number | null;
  featureVersion: string;
}

export interface RecipientRiskSnapshot {
  id: string;
  phoneHash: string;
  merchantId: string | null;
  scope: "PLATFORM" | "MERCHANT";
  /** 0 (safest) - 100 (highest operational risk). Heuristic score, not probability. */
  riskScore: number;
  level: RiskLevel;
  reasons: RiskReason[];
  /** LOW when cold-start / insufficient data. */
  riskConfidence: RiskConfidence;
  scoringVersion: string;
  featureSnapshot: RecipientFeatureSnapshot;
  scoredAt: string;
}

/* ------------------------------------------------------------------ */
/* RTO prediction                                                      */
/* ------------------------------------------------------------------ */

export type RtoModelType = "RULE_BASED" | "ML";

export type RtoPredictionLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface RtoFeatureSet {
  deliverySuccessRate: number;
  rtoRate: number;
  codFailureRate: number;
  recentOrderCount: number;
  recentFailureCount: number;
  addressConfidence: number | null;
  codAmountMinor: number;
  featureVersion: string;
}

export interface RtoPredictionRecord {
  id: string;
  parcelId: string;
  phoneHash: string;
  /** Heuristic risk score 0-100 (NOT a calibrated probability). */
  score: number;
  level: RtoPredictionLevel;
  reasons: RiskReason[];
  modelType: RtoModelType;
  modelVersion: string;
  features: RtoFeatureSet;
  /** Prediction timestamp — features only use data <= this (no leakage). */
  predictedAt: string;
  outcome: "DELIVERED" | "RTO" | "PENDING" | null;
  outcomeAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */

export enum RecommendationAction {
  VERIFY_ADDRESS = "VERIFY_ADDRESS",
  MANUAL_REVIEW = "MANUAL_REVIEW",
  CALL_CUSTOMER = "CALL_CUSTOMER",
  SUGGEST_PREPAID = "SUGGEST_PREPAID",
  SUGGEST_LOWER_COD = "SUGGEST_LOWER_COD",
  REVIEW_BEFORE_DISPATCH = "REVIEW_BEFORE_DISPATCH",
}

export type RecommendationStatus = "ACTIVE" | "ACCEPTED" | "DISMISSED" | "OVERRIDDEN";

export interface IntelligenceRecommendation {
  id: string;
  parcelId: string;
  predictionId: string | null;
  action: RecommendationAction;
  reasons: RiskReason[];
  status: RecommendationStatus;
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideReason: string | null;
  createdAt: string;
}

export const recommendationOverrideRequestSchema = z.object({
  decision: z.enum(["PROCEED", "HOLD"]),
  reason: z.string().min(3, "Override reason is required").max(500),
});

export type RecommendationOverrideRequest = z.infer<typeof recommendationOverrideRequestSchema>;

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export const intelligenceFeedbackSchema = z.object({
  subjectType: z.enum(["ADDRESS", "RISK", "RTO", "RECOMMENDATION"]),
  subjectId: z.string().min(1).max(128),
  signal: z.enum([
    "ADDRESS_ACCEPTED",
    "ADDRESS_REJECTED",
    "ADDRESS_CORRECTED",
    "RISK_CORRECT",
    "RISK_INCORRECT",
    "RTO_CORRECT",
    "RTO_INCORRECT",
    "RECOMMENDATION_ACCEPTED",
    "RECOMMENDATION_IGNORED",
  ]),
  detail: z.string().max(500).optional(),
});

export type IntelligenceFeedbackInput = z.infer<typeof intelligenceFeedbackSchema>;

/* ------------------------------------------------------------------ */
/* Model registry                                                      */
/* ------------------------------------------------------------------ */

export type ScoringModelStatus = "DRAFT" | "ACTIVE" | "RETIRED";

export interface ScoringModelRecord {
  id: string;
  name: string;
  version: string;
  type: string;
  status: ScoringModelStatus;
  configuration: Record<string, unknown>;
  createdAt: string;
  activatedAt: string | null;
  retiredAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Engine interfaces (future ML plugs in here)                         */
/* ------------------------------------------------------------------ */

export interface AddressParserEngine {
  readonly parserVersion: string;
  readonly datasetVersion: string;
  parse(rawAddress: string, opts?: { districtHint?: string; maxCandidates?: number }): AddressParseV2Result;
}

export interface RiskScorerEngine {
  readonly scoringVersion: string;
  score(features: RecipientFeatureSnapshot): { score: number; level: RiskLevel; reasons: RiskReason[] };
}

export interface RtoPredictorEngine {
  readonly modelType: RtoModelType;
  readonly modelVersion: string;
  predict(features: RtoFeatureSet): { score: number; level: RtoPredictionLevel; reasons: RiskReason[] };
}

export interface RecommendationEngine {
  recommend(input: {
    risk: { score: number; level: RiskLevel; reasons: RiskReason[] };
    rto: { score: number; level: RtoPredictionLevel };
    address: { confidence: number; requiresConfirmation: boolean };
  }): Array<{ action: RecommendationAction; reasons: RiskReason[] }>;
}

/* ------------------------------------------------------------------ */
/* Threshold configuration (centralized, not hardcoded)                */
/* ------------------------------------------------------------------ */

export interface IntelligenceThresholds {
  riskLow: number;
  riskHigh: number;
  rtoLow: number;
  rtoHigh: number;
  recentDays: number;
  velocityOrderCount: number;
  highCodMinor: number;
}

export const DEFAULT_INTELLIGENCE_THRESHOLDS: IntelligenceThresholds = {
  riskLow: 30,
  riskHigh: 70,
  rtoLow: 30,
  rtoHigh: 70,
  recentDays: 30,
  velocityOrderCount: 5,
  highCodMinor: 1000000,
};

export { DeliveryZone };
