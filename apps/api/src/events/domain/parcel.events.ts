import { DomainEventType } from "@dhruto/contracts";
import { DomainEvent, type DomainEventMetadata } from "../base/domain-event.base.js";

export interface ParcelCreatedPayload {
  trackingCode: string;
  recipientName: string;
  recipientPhone: string;
  district?: string | null;
  thana?: string | null;
  deliveryAddress: string;
  codAmount: number;
  weight: number;
  deliveryFee: number;
}

export class ParcelCreatedEvent extends DomainEvent<ParcelCreatedPayload> {
  readonly eventType = DomainEventType.PARCEL_CREATED;
  readonly eventName = "parcel.created";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelCreatedPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}

export interface ParcelAssignedPayload {
  trackingCode: string;
  riderId: string;
  hubId?: string | null;
}

export class ParcelAssignedEvent extends DomainEvent<ParcelAssignedPayload> {
  readonly eventType = DomainEventType.PARCEL_ASSIGNED;
  readonly eventName = "parcel.assigned";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelAssignedPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}

export interface ParcelOutForDeliveryPayload {
  trackingCode: string;
  riderId: string;
  recipientPhone: string;
}

export class ParcelOutForDeliveryEvent extends DomainEvent<ParcelOutForDeliveryPayload> {
  readonly eventType = DomainEventType.PARCEL_OUT_FOR_DELIVERY;
  readonly eventName = "parcel.out_for_delivery";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelOutForDeliveryPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}

export interface ParcelDeliveredPayload {
  trackingCode: string;
  riderId: string;
  codCollected: number;
}

export class ParcelDeliveredEvent extends DomainEvent<ParcelDeliveredPayload> {
  readonly eventType = DomainEventType.PARCEL_DELIVERED;
  readonly eventName = "parcel.delivered";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelDeliveredPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}

export interface ParcelFailedPayload {
  trackingCode: string;
  riderId: string;
  reason: string;
}

export class ParcelFailedEvent extends DomainEvent<ParcelFailedPayload> {
  readonly eventType = DomainEventType.PARCEL_FAILED;
  readonly eventName = "parcel.failed";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelFailedPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}

export interface ParcelReturnedPayload {
  trackingCode: string;
  hubId?: string | null;
}

export class ParcelReturnedEvent extends DomainEvent<ParcelReturnedPayload> {
  readonly eventType = DomainEventType.PARCEL_RETURNED;
  readonly eventName = "parcel.returned";

  constructor(meta: Omit<DomainEventMetadata, "aggregateType">, payload: ParcelReturnedPayload) {
    super({ ...meta, aggregateType: "PARCEL" }, payload);
  }
}
