import { DomainEventType } from "@dhruto/contracts";
import { DomainEvent, type DomainEventMetadata } from "../base/domain-event.base.js";

export interface CashHandInSubmittedPayload {
  riderId: string;
  hubId: string;
  totalAmount: number;
  count: number;
  handInId: string;
}

export class CashHandInSubmittedEvent extends DomainEvent<CashHandInSubmittedPayload> {
  readonly eventType = DomainEventType.CASH_HAND_IN_SUBMITTED;
  readonly eventName = "rider.cash_hand_in_submitted";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: CashHandInSubmittedPayload) {
    super({ ...meta, aggregateType: "RIDER" }, payload);
  }
}

export interface RiderDutyChangedPayload {
  riderId: string;
  onDuty: boolean;
}

export class RiderDutyChangedEvent extends DomainEvent<RiderDutyChangedPayload> {
  readonly eventType = "rider.duty_changed.v1";
  readonly eventName = "rider.duty_changed";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: RiderDutyChangedPayload) {
    super({ ...meta, aggregateType: "RIDER" }, payload);
  }
}
