import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export class VerifyOtpDto extends createZodDto(verifyOtpSchema) {
  @ApiProperty({ example: "592814", description: "6-digit delivery verification OTP" })
  otp: string;
}

export const completeDeliverySchema = z.object({
  otp: z.string().optional(),
  codAmountCollected: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
  proofPhotoUrl: z.string().url().optional(),
});

export class CompleteDeliveryDto extends createZodDto(completeDeliverySchema) {
  @ApiPropertyOptional({ example: "592814", description: "Customer OTP if required" })
  otp?: string;

  @ApiPropertyOptional({ example: 1250, description: "Actual COD cash collected in BDT" })
  codAmountCollected?: number;

  @ApiPropertyOptional({ example: "Delivered to recipient in person" })
  remarks?: string;

  @ApiPropertyOptional({ example: "https://storage.dhruto.com/proofs/delivery-123.jpg" })
  proofPhotoUrl?: string;
}

export const failDeliverySchema = z.object({
  reason: z.enum([
    "CUSTOMER_UNAVAILABLE",
    "CUSTOMER_REFUSED",
    "ADDRESS_INCORRECT",
    "PAYMENT_NOT_READY",
    "CUSTOMER_REQUESTED_RESCHEDULE",
    "DAMAGED_PACKAGE",
    "OTHER",
  ]),
  rescheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

export class FailDeliveryDto extends createZodDto(failDeliverySchema) {
  @ApiProperty({
    enum: [
      "CUSTOMER_UNAVAILABLE",
      "CUSTOMER_REFUSED",
      "ADDRESS_INCORRECT",
      "PAYMENT_NOT_READY",
      "CUSTOMER_REQUESTED_RESCHEDULE",
      "DAMAGED_PACKAGE",
      "OTHER",
    ],
    example: "CUSTOMER_UNAVAILABLE",
  })
  reason:
    | "CUSTOMER_UNAVAILABLE"
    | "CUSTOMER_REFUSED"
    | "ADDRESS_INCORRECT"
    | "PAYMENT_NOT_READY"
    | "CUSTOMER_REQUESTED_RESCHEDULE"
    | "DAMAGED_PACKAGE"
    | "OTHER";

  @ApiPropertyOptional({ example: "2026-10-06T10:00:00Z" })
  rescheduledDate?: string;

  @ApiPropertyOptional({ example: "Phone was switched off after 3 call attempts." })
  notes?: string;
}

export const cashHandInSchema = z.object({
  notes: z.string().optional(),
});

export class CashHandInDto extends createZodDto(cashHandInSchema) {
  @ApiPropertyOptional({ example: "Evening cash hand-in at Tejgaon Hub" })
  notes?: string;
}
