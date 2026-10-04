import { z } from "zod";

export enum DeliveryFailureReason {
  CUSTOMER_UNAVAILABLE = "CUSTOMER_UNAVAILABLE",
  CUSTOMER_REFUSED = "CUSTOMER_REFUSED",
  ADDRESS_INCORRECT = "ADDRESS_INCORRECT",
  PAYMENT_NOT_READY = "PAYMENT_NOT_READY",
  CUSTOMER_REQUESTED_RESCHEDULE = "CUSTOMER_REQUESTED_RESCHEDULE",
  DAMAGED_PACKAGE = "DAMAGED_PACKAGE",
  OTHER = "OTHER",
}

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const completeDeliverySchema = z.object({
  otp: z.string().optional(),
  codAmountCollected: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
  proofPhotoUrl: z.string().url().optional(),
});

export type CompleteDeliveryDto = z.infer<typeof completeDeliverySchema>;

export const failDeliverySchema = z.object({
  reason: z.nativeEnum(DeliveryFailureReason),
  rescheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

export type FailDeliveryDto = z.infer<typeof failDeliverySchema>;

export const cashHandInSchema = z.object({
  notes: z.string().optional(),
});

export type CashHandInDto = z.infer<typeof cashHandInSchema>;

export interface RiderTaskItem {
  id: string;
  trackingCode: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  district?: string;
  thana?: string;
  weight: number;
  codAmount: number;
  deliveryFee: number;
  deliveryOtp?: string;
  merchantBusinessName: string;
  merchantPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiderCashSummary {
  totalCollected: number;
  pendingHandIn: number;
  awaitingVerification: number;
  verifiedByHub: number;
  totalParcelsCount: number;
}
