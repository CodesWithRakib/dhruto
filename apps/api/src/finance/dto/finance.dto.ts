import { createZodDto } from "nestjs-zod";
import {
  requestPayoutSchema,
  verifyCashLedgerSchema,
  processPayoutSchema,
} from "@dhruto/contracts";

export class RequestPayoutDto extends createZodDto(requestPayoutSchema) {}
export class VerifyCashLedgerDto extends createZodDto(verifyCashLedgerSchema) {}
export class ProcessPayoutDto extends createZodDto(processPayoutSchema) {}
