import { DeliveryAttemptOutcome, DeliveryFailureReason } from "@dhruto/contracts";

export interface SeedAttemptData {
  trackingCode: string;
  riderEmail: string;
  attemptNumber: number;
  outcome: DeliveryAttemptOutcome;
  failureReason?: DeliveryFailureReason;
  notes?: string;
  hoursAgo: number;
}

export const SEED_INTELLIGENCE_ATTEMPTS: SeedAttemptData[] = [
  {
    trackingCode: "DHR-2610-00201",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.FAILED,
    failureReason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
    notes: "Gate locked, phone switched off",
    hoursAgo: 90,
  },
  {
    trackingCode: "DHR-2610-00201",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 2,
    outcome: DeliveryAttemptOutcome.FAILED,
    failureReason: DeliveryFailureReason.CUSTOMER_REFUSED,
    notes: "Refused high COD at doorstep",
    hoursAgo: 88,
  },
  {
    trackingCode: "DHR-2610-00202",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.FAILED,
    failureReason: DeliveryFailureReason.PAYMENT_NOT_READY,
    notes: "Cash not ready",
    hoursAgo: 66,
  },
  {
    trackingCode: "DHR-2610-00203",
    riderEmail: "rider2@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.FAILED,
    failureReason: DeliveryFailureReason.ADDRESS_INCORRECT,
    notes: "Typo address, could not locate",
    hoursAgo: 46,
  },
  {
    trackingCode: "DHR-2610-00204",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.FAILED,
    failureReason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
    hoursAgo: 28,
  },
  {
    trackingCode: "DHR-2610-00206",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.DELIVERED,
    hoursAgo: 88,
  },
  {
    trackingCode: "DHR-2610-00207",
    riderEmail: "rider@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.DELIVERED,
    hoursAgo: 58,
  },
  {
    trackingCode: "DHR-2610-00208",
    riderEmail: "rider2@dhruto.com",
    attemptNumber: 1,
    outcome: DeliveryAttemptOutcome.DELIVERED,
    hoursAgo: 34,
  },
];
