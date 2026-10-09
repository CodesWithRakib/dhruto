import { DomainEventType } from "@dhruto/contracts";
import { DomainEvent, type DomainEventMetadata } from "../base/domain-event.base.js";

export interface PayoutRequestedPayload {
  payoutId: string;
  amountPaisa: number;
  paymentMethod: string;
}

export class PayoutRequestedEvent extends DomainEvent<PayoutRequestedPayload> {
  readonly eventType = DomainEventType.PAYOUT_REQUESTED;
  readonly eventName = "finance.payout_requested";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: PayoutRequestedPayload) {
    super({ ...meta, aggregateType: "PAYOUT" }, payload);
  }
}

export interface PayoutApprovedPayload {
  payoutId: string;
  amountPaisa: number;
}

export class PayoutApprovedEvent extends DomainEvent<PayoutApprovedPayload> {
  readonly eventType = DomainEventType.PAYOUT_APPROVED;
  readonly eventName = "finance.payout_approved";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: PayoutApprovedPayload) {
    super({ ...meta, aggregateType: "PAYOUT" }, payload);
  }
}

export interface PayoutCompletedPayload {
  payoutId: string;
  amountPaisa: number;
  transactionRef?: string;
}

export class PayoutCompletedEvent extends DomainEvent<PayoutCompletedPayload> {
  readonly eventType = DomainEventType.PAYOUT_COMPLETED;
  readonly eventName = "finance.payout_completed";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: PayoutCompletedPayload) {
    super({ ...meta, aggregateType: "PAYOUT" }, payload);
  }
}

export interface PayoutFailedPayload {
  payoutId: string;
  reason: string;
}

export class PayoutFailedEvent extends DomainEvent<PayoutFailedPayload> {
  readonly eventType = DomainEventType.PAYOUT_FAILED;
  readonly eventName = "finance.payout_failed";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: PayoutFailedPayload) {
    super({ ...meta, aggregateType: "PAYOUT" }, payload);
  }
}

export interface CashVerifiedPayload {
  handInId: string;
  hubId?: string | null;
  verifiedAmount: number;
}

export class CashVerifiedEvent extends DomainEvent<CashVerifiedPayload> {
  readonly eventType = DomainEventType.CASH_VERIFIED;
  readonly eventName = "finance.cash_verified";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: CashVerifiedPayload) {
    super({ ...meta, aggregateType: "HAND_IN" }, payload);
  }
}

export interface SettlementCreatedPayload {
  settlementId: string;
  totalAmountPaisa: number;
}

export class SettlementCreatedEvent extends DomainEvent<SettlementCreatedPayload> {
  readonly eventType = DomainEventType.SETTLEMENT_CREATED;
  readonly eventName = "finance.settlement_created";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: SettlementCreatedPayload) {
    super({ ...meta, aggregateType: "SETTLEMENT" }, payload);
  }
}

export interface DiscrepancyOpenedPayload {
  discrepancyId: string;
  reason: string;
  amountPaisa?: number;
}

export class DiscrepancyOpenedEvent extends DomainEvent<DiscrepancyOpenedPayload> {
  readonly eventType = DomainEventType.DISCREPANCY_OPENED;
  readonly eventName = "finance.discrepancy_opened";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: DiscrepancyOpenedPayload) {
    super({ ...meta, aggregateType: "DISCREPANCY" }, payload);
  }
}
