import { Injectable, Logger } from "@nestjs/common";
import {
  type AddressParseRequest,
  type AddressParseResult,
  type RecipientRiskEvaluateRequest,
  type RecipientRiskResult,
} from "@dhruto/contracts";
import { AddressParserService } from "./services/address-parser.service.js";
import { RiskScoringService } from "./services/risk-scoring.service.js";

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly addressParser: AddressParserService,
    private readonly riskScorer: RiskScoringService,
  ) {}

  /**
   * Parses and normalizes free-form Bangladesh address text.
   */
  parseAddress(dto: AddressParseRequest): AddressParseResult {
    this.logger.log(`Parsing address: "${dto.rawAddress.substring(0, 40)}..."`);
    return this.addressParser.parse(dto.rawAddress);
  }

  /**
   * Evaluates recipient risk and predicts RTO probability.
   */
  async evaluateRisk(dto: RecipientRiskEvaluateRequest): Promise<RecipientRiskResult> {
    this.logger.log(`Evaluating risk for recipient ${dto.recipientPhone} (COD: ৳${dto.codAmount})`);
    return this.riskScorer.evaluateRisk(dto);
  }

  /**
   * Full intelligence sweep for booking workflow: address parse + risk score.
   */
  async analyzeBooking(dto: RecipientRiskEvaluateRequest): Promise<{
    parsedAddress: AddressParseResult;
    riskProfile: RecipientRiskResult;
  }> {
    const parsedAddress = this.addressParser.parse(dto.rawAddress);
    const riskProfile = await this.riskScorer.evaluateRisk(dto);

    return {
      parsedAddress,
      riskProfile,
    };
  }
}
