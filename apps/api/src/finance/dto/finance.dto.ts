import { createZodDto } from "nestjs-zod";
import {
  requestPayoutSchema,
  verifyCashLedgerSchema,
  processPayoutSchema,
  approvePayoutSchema,
  createAdjustmentSchema,
  reverseTransactionSchema,
  createSettlementBatchSchema,
  resolveDiscrepancySchema,
} from "@dhruto/contracts";

export class RequestPayoutDto extends createZodDto(requestPayoutSchema) {}
export class VerifyCashLedgerDto extends createZodDto(verifyCashLedgerSchema) {}
export class ProcessPayoutDto extends createZodDto(processPayoutSchema) {}
export class ApprovePayoutDto extends createZodDto(approvePayoutSchema) {}
export class CreateAdjustmentDto extends createZodDto(createAdjustmentSchema) {}
export class ReverseTransactionDto extends createZodDto(reverseTransactionSchema) {}
export class CreateSettlementBatchDto extends createZodDto(createSettlementBatchSchema) {}
export class ResolveDiscrepancyDto extends createZodDto(resolveDiscrepancySchema) {}
