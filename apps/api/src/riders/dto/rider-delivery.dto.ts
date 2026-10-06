import { createZodDto } from "nestjs-zod";
import {
  verifyOtpSchema,
  requestOtpSchema,
  completeDeliverySchema,
  failDeliverySchema,
  cashHandInSchema,
  setDutySchema,
} from "@dhruto/contracts";

export class VerifyOtpDto extends createZodDto(verifyOtpSchema) {}
export class RequestOtpDto extends createZodDto(requestOtpSchema) {}
export class CompleteDeliveryDto extends createZodDto(completeDeliverySchema) {}
export class FailDeliveryDto extends createZodDto(failDeliverySchema) {}
export class CashHandInDto extends createZodDto(cashHandInSchema) {}
export class SetDutyDto extends createZodDto(setDutySchema) {}
