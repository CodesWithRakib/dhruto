import { createZodDto } from "nestjs-zod";
import {
  addressParseRequestSchema,
  addressParseV2RequestSchema,
  addressConfirmRequestSchema,
  recipientRiskEvaluateRequestSchema,
  recommendationOverrideRequestSchema,
  intelligenceFeedbackSchema,
} from "@dhruto/contracts";

export class AddressParseDto extends createZodDto(addressParseRequestSchema) {}
export class RecipientRiskEvaluateDto extends createZodDto(recipientRiskEvaluateRequestSchema) {}
export class AddressParseV2Dto extends createZodDto(addressParseV2RequestSchema) {}
export class AddressConfirmDto extends createZodDto(addressConfirmRequestSchema) {}
export class RecommendationOverrideDto extends createZodDto(recommendationOverrideRequestSchema) {}
export class IntelligenceFeedbackDto extends createZodDto(intelligenceFeedbackSchema) {}
