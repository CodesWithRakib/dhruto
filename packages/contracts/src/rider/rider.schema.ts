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

/** Outcome recorded on the append-only delivery attempt log. */
export enum DeliveryAttemptOutcome {
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

/** Rider shift state. Only ON_DUTY (and legacy ACTIVE) riders may operate. */
export enum RiderDutyStatus {
  ON_DUTY = "ON_DUTY",
  OFF_DUTY = "OFF_DUTY",
}

/* ------------------------------------------------------------------ */
/* OTP                                                                 */
/* ------------------------------------------------------------------ */

export const OTP_LENGTH = 6;
/** OTP is valid for 15 minutes from generation. */
export const OTP_TTL_SECONDS = 15 * 60;
/** Wrong guesses before the OTP locks and a resend is required. */
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between two OTP requests for the same parcel. */
export const OTP_REQUEST_COOLDOWN_SECONDS = 60;
/** Maximum OTP generations per parcel delivery leg. */
export const OTP_MAX_REQUESTS = 5;

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const requestOtpSchema = z.object({}).strict();

export type RequestOtpDto = z.infer<typeof requestOtpSchema>;

/* ------------------------------------------------------------------ */
/* Delivery commands                                                   */
/* ------------------------------------------------------------------ */

export const completeDeliverySchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits")
    .optional(),
  codAmountCollected: z.coerce.number().min(0).max(10_000_000).optional(),
  remarks: z.string().trim().max(500).optional(),
  proofPhotoUrl: z.string().url().max(2048).optional(),
});

export type CompleteDeliveryDto = z.infer<typeof completeDeliverySchema>;

export const failDeliverySchema = z.object({
  reason: z.nativeEnum(DeliveryFailureReason),
  rescheduledDate: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type FailDeliveryDto = z.infer<typeof failDeliverySchema>;

export const cashHandInSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type CashHandInDto = z.infer<typeof cashHandInSchema>;

export const setDutySchema = z.object({
  duty: z.nativeEnum(RiderDutyStatus),
});

export type SetDutyDto = z.infer<typeof setDutySchema>;

/* ------------------------------------------------------------------ */
/* Rider tasks, history, dashboard, profile                            */
/* ------------------------------------------------------------------ */

/**
 * A parcel assigned to the authenticated rider.
 *
 * Privacy: no merchant financials, no fraud data, no OTP secret. The rider
 * learns the OTP only from the customer, never from this payload.
 */
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
  attemptCount: number;
  otpVerified: boolean;
  otpExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiderTaskDetails extends RiderTaskItem {
  deliveryFee: number;
  currentHubCode: string | null;
  currentHubName: string | null;
  attempts: DeliveryAttemptItem[];
}

export interface DeliveryAttemptItem {
  id: string;
  attemptNumber: number;
  outcome: DeliveryAttemptOutcome;
  failureReason: DeliveryFailureReason | null;
  notes: string | null;
  rescheduledFor: string | null;
  codCollected: number | null;
  createdAt: string;
}

export interface RiderCashSummary {
  totalCollected: number;
  pendingHandIn: number;
  awaitingVerification: number;
  verifiedByHub: number;
  totalParcelsCount: number;
}

export interface RiderDashboard {
  riderCode: string;
  riderName: string;
  hubCode: string;
  hubName: string;
  duty: RiderDutyStatus;
  counts: {
    assigned: number;
    inProgress: number;
    deliveredToday: number;
    failedToday: number;
  };
  codToCollect: number;
  parcelsInHand: number;
}

export interface RiderHistoryItem {
  id: string;
  trackingCode: string;
  status: string;
  recipientName: string;
  district: string | null;
  codCollected: number | null;
  attemptCount: number;
  updatedAt: string;
}

export interface RiderProfile {
  riderCode: string;
  name: string;
  email: string;
  phone: string;
  hubCode: string;
  hubName: string;
  status: string;
  duty: RiderDutyStatus;
  joinedAt: string;
}

/* ------------------------------------------------------------------ */
/* Command results                                                     */
/* ------------------------------------------------------------------ */

export interface StartDeliveryResult {
  parcelId: string;
  trackingCode: string;
  status: string;
  otpSent: boolean;
  otpExpiresAt: string;
  message: string;
  /**
   * Returned ONLY outside production (`NODE_ENV !== "production"`) so
   * automated E2E can complete the customer-handoff leg. Never present in
   * production responses and never rendered in the rider UI.
   */
  otp?: string;
}

export interface RequestOtpResult {
  parcelId: string;
  trackingCode: string;
  otpSent: boolean;
  otpExpiresAt: string;
  attemptsRemaining: number;
  /**
   * Returned ONLY outside production (`NODE_ENV !== "production"`) so
   * automated E2E can complete the customer-handoff leg. Never present in
   * production responses and never rendered in the rider UI.
   */
  otp?: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  message: string;
  attemptsRemaining: number;
  verifiedAt: string | null;
}

export interface CompleteDeliveryResult {
  parcelId: string;
  trackingCode: string;
  status: string;
  attemptId: string;
  attemptNumber: number;
  codAmountCollected: number;
  cashLedgerId: string | null;
  proof: {
    type: "OTP";
    verifiedAt: string;
    photoUrl: string | null;
  };
  message: string;
}

export interface FailDeliveryResult {
  parcelId: string;
  trackingCode: string;
  status: string;
  attemptId: string;
  attemptNumber: number;
  reason: DeliveryFailureReason;
  rescheduledFor: string | null;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Hub/admin rider operations                                          */
/* ------------------------------------------------------------------ */

/** Response of `POST /parcels/:id/assign-rider`. */
export interface ParcelAssignmentResult {
  parcelId: string;
  trackingCode: string;
  riderId: string;
  status: string;
  reassigned: boolean;
  message: string;
}

export interface RiderListItem {
  id: string;
  riderCode: string;
  name: string;
  phone: string;
  hubCode: string;
  hubName: string;
  status: string;
  duty: RiderDutyStatus;
  activeTaskCount: number;
  deliveredTodayCount: number;
}

export interface RiderAssignmentRecord {
  id: string;
  parcelId: string;
  trackingCode: string;
  riderId: string;
  assignedBy: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface RiderDetails extends RiderListItem {
  email: string;
  joinedAt: string;
  activeTasks: RiderHistoryItem[];
  assignments: RiderAssignmentRecord[];
}
