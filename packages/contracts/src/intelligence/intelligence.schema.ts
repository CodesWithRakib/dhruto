import { z } from "zod";
import { DeliveryZone } from "../parcel/parcel.schema.js";

export const addressParseRequestSchema = z.object({
  rawAddress: z.string().min(3, "Address must be at least 3 characters").max(500),
});

export type AddressParseRequest = z.infer<typeof addressParseRequestSchema>;

export interface AddressParseResult {
  rawAddress: string;
  district: string;
  thana: string;
  area: string | null;
  postalCode: string | null;
  zone: DeliveryZone;
  confidenceScore: number; // 0 - 100
  confidenceTier: "HIGH" | "MEDIUM" | "LOW";
  language: "EN" | "BN" | "MIXED";
  suggestedCorrections?: string[];
  matchedKeywords: string[];
}

export const recipientRiskEvaluateRequestSchema = z.object({
  recipientPhone: z.string().min(10, "Phone number is required"),
  codAmount: z.number().min(0, "COD amount cannot be negative"),
  rawAddress: z.string().min(3, "Delivery address is required"),
  district: z.string().optional(),
  thana: z.string().optional(),
  weight: z.number().optional(),
});

export type RecipientRiskEvaluateRequest = z.infer<typeof recipientRiskEvaluateRequestSchema>;

export type RiskTier = "LOW" | "MEDIUM" | "HIGH";

export interface RiskFactor {
  code: string;
  label: string;
  impact: "POSITIVE" | "NEUTRAL" | "WARNING" | "CRITICAL";
  description: string;
}

export interface RecipientDeliveryHistory {
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  completionRate: number; // 0 - 100%
}

export interface RecipientRiskResult {
  recipientPhone: string;
  normalizedPhone: string;
  riskScore: number; // 0 (safest) - 100 (highest risk)
  riskTier: RiskTier;
  rtoProbability: number; // 0 - 100%
  deliveryHistory: RecipientDeliveryHistory;
  riskFactors: RiskFactor[];
  operationalRecommendations: string[];
  safeToDispatch: boolean;
  requiresPhoneVerification: boolean;
  requiresAdvancePayment: boolean;
  parsedAddress?: AddressParseResult;
}
