import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  type RecipientRiskEvaluateRequest,
  type RecipientRiskResult,
  type RiskFactor,
  type RecipientDeliveryHistory,
  ParcelStatus,
} from "@dhruto/contracts";
import { Parcel } from "../../database/entities/index.js";
import { AddressParserService } from "./address-parser.service.js";

const VALID_BD_PHONE_PREFIXES = ["013", "017", "014", "019", "018", "016", "015"];

@Injectable()
export class RiskScoringService {
  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    private readonly addressParser: AddressParserService,
  ) {}

  /**
   * Normalizes phone number to 11 digits: 017XXXXXXXX
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("8801")) return digits.substring(2);
    if (digits.startsWith("01")) return digits;
    return digits;
  }

  /**
   * Evaluates recipient risk and predicts RTO probability.
   */
  async evaluateRisk(req: RecipientRiskEvaluateRequest): Promise<RecipientRiskResult> {
    const normalizedPhone = this.normalizePhone(req.recipientPhone);
    const riskFactors: RiskFactor[] = [];
    const recommendations: string[] = [];

    let score = 25; // Base starting score

    // 1. Phone number validation
    const hasValidPrefix = VALID_BD_PHONE_PREFIXES.some((p) =>
      normalizedPhone.startsWith(p),
    );
    const hasValidLength = normalizedPhone.length === 11;

    if (!hasValidPrefix || !hasValidLength) {
      score += 35;
      riskFactors.push({
        code: "INVALID_PHONE_FORMAT",
        label: "Irregular Phone Format",
        impact: "CRITICAL",
        description: `Phone ${req.recipientPhone} does not match 11-digit Bangladeshi mobile carrier standards.`,
      });
      recommendations.push("Verify recipient contact number with customer before booking.");
    } else {
      riskFactors.push({
        code: "VALID_BD_PHONE",
        label: "Verified BD Operator",
        impact: "POSITIVE",
        description: "Phone format matches active Bangladeshi mobile operator series.",
      });
    }

    // 2. Recipient Historical Delivery Performance
    const history = await this.getRecipientHistory(normalizedPhone);
    if (history.totalOrders === 0) {
      score += 10;
      riskFactors.push({
        code: "FIRST_TIME_RECIPIENT",
        label: "First-Time Recipient",
        impact: "NEUTRAL",
        description: "No past shipping history found across Dhruto network for this phone number.",
      });
      recommendations.push("Call recipient to confirm delivery address and availability.");
    } else if (history.returnedOrders > 0) {
      const returnRatio = history.returnedOrders / history.totalOrders;
      const penalty = Math.round(returnRatio * 45);
      score += penalty;
      riskFactors.push({
        code: "PAST_RTO_HISTORY",
        label: "Previous Return History",
        impact: "CRITICAL",
        description: `Recipient has ${history.returnedOrders} return(s) out of ${history.totalOrders} total shipment(s) (${Math.round(returnRatio * 100)}% return rate).`,
      });
      recommendations.push("Require partial advance payment or delivery fee before dispatch.");
    } else if (history.deliveredOrders >= 2) {
      score -= 20; // Loyal reliable buyer
      riskFactors.push({
        code: "PROVEN_BUYER_RECORD",
        label: "Reliable Recipient",
        impact: "POSITIVE",
        description: `100% successful completion across ${history.deliveredOrders} previous orders.`,
      });
      recommendations.push("Verified recipient: Safe to dispatch without delay.");
    }

    // 3. Address Parsing & Completeness Analysis
    const parsedAddress = this.addressParser.parse(req.rawAddress);
    if (parsedAddress.confidenceScore < 50) {
      score += 25;
      riskFactors.push({
        code: "VAGUE_DELIVERY_ADDRESS",
        label: "Incomplete Address",
        impact: "WARNING",
        description: `Address confidence is low (${parsedAddress.confidenceScore}%). Missing specific street, sector, or landmark details.`,
      });
      recommendations.push("Request detailed delivery landmark or house/road from recipient.");
    } else if (parsedAddress.confidenceScore >= 80) {
      score -= 10;
      riskFactors.push({
        code: "HIGH_CONFIDENCE_ADDRESS",
        label: "Precise Address Match",
        impact: "POSITIVE",
        description: `Address matched to ${parsedAddress.thana}, ${parsedAddress.district} with high accuracy (${parsedAddress.confidenceScore}%).`,
      });
    }

    // 4. COD Value vs Risk
    const cod = Number(req.codAmount) || 0;
    if (cod === 0) {
      score -= 25;
      riskFactors.push({
        code: "PREPAID_SHIPMENT",
        label: "Prepaid Shipment (Zero COD)",
        impact: "POSITIVE",
        description: "Zero COD eliminates refusal risk at doorstep.",
      });
    } else if (cod >= 10000) {
      score += 25;
      riskFactors.push({
        code: "HIGH_COD_VALUE",
        label: "High Cash on Delivery (৳10,000+)",
        impact: "WARNING",
        description: `High COD amount (৳${cod.toLocaleString()}) increases refusal probability.`,
      });
      recommendations.push("Recommend OTP-protected delivery confirmation.");
    } else if (cod >= 4000) {
      score += 10;
      riskFactors.push({
        code: "MODERATE_COD_VALUE",
        label: "Moderate COD (৳4,000+)",
        impact: "NEUTRAL",
        description: `COD amount is ৳${cod.toLocaleString()}.`,
      });
    }

    // Clamp score 0 - 100
    const riskScore = Math.max(0, Math.min(100, score));

    // Classify risk tier
    const riskTier = riskScore < 30 ? "LOW" : riskScore < 70 ? "MEDIUM" : "HIGH";

    // Predicted RTO probability (calibrated to risk score)
    const rtoProbability = Math.round(Math.max(5, Math.min(95, riskScore * 0.85)));

    const safeToDispatch = riskTier === "LOW";
    const requiresPhoneVerification = riskTier === "MEDIUM" || riskTier === "HIGH";
    const requiresAdvancePayment = riskTier === "HIGH" && cod > 2000;

    return {
      recipientPhone: req.recipientPhone,
      normalizedPhone,
      riskScore,
      riskTier,
      rtoProbability,
      deliveryHistory: history,
      riskFactors,
      operationalRecommendations: recommendations,
      safeToDispatch,
      requiresPhoneVerification,
      requiresAdvancePayment,
      parsedAddress,
    };
  }

  /**
   * Aggregates historical delivery metrics for a phone number.
   */
  private async getRecipientHistory(phone: string): Promise<RecipientDeliveryHistory> {
    const rawParcels = await this.parcelRepo
      .createQueryBuilder("p")
      .where("p.recipient_phone LIKE :phone", { phone: `%${phone.slice(-9)}%` })
      .getMany();

    const totalOrders = rawParcels.length;
    const deliveredOrders = rawParcels.filter(
      (p) =>
        p.status === ParcelStatus.DELIVERED ||
        p.status === ParcelStatus.CASH_PENDING ||
        p.status === ParcelStatus.CASH_VERIFIED,
    ).length;

    const returnedOrders = rawParcels.filter(
      (p) =>
        p.status === ParcelStatus.RTO_INITIATED ||
        p.status === ParcelStatus.RETURN_IN_TRANSIT ||
        p.status === ParcelStatus.RETURNED_TO_MERCHANT ||
        p.status === ParcelStatus.CANCELLED,
    ).length;

    const completionRate =
      totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    return {
      totalOrders,
      deliveredOrders,
      returnedOrders,
      completionRate,
    };
  }
}
