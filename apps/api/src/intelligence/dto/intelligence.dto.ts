import { createZodDto } from "nestjs-zod";
import {
  addressParseRequestSchema,
  recipientRiskEvaluateRequestSchema,
} from "@dhruto/contracts";

export class AddressParseDto extends createZodDto(addressParseRequestSchema) {}
export class RecipientRiskEvaluateDto extends createZodDto(recipientRiskEvaluateRequestSchema) {}
