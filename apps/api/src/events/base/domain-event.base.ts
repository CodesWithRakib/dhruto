import { DomainEventType } from "@dhruto/contracts";
import crypto from "node:crypto";

export interface DomainEventMetadata {
  eventId?: string;
  occurredAt?: Date;
  aggregateType: string;
  aggregateId: string;
  merchantId?: string | null;
}

export abstract class DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: DomainEventType | string;
  abstract readonly eventName: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly merchantId: string | null;
  readonly payload: TPayload;

  constructor(meta: DomainEventMetadata, payload: TPayload) {
    this.eventId = meta.eventId ?? crypto.randomUUID();
    this.occurredAt = meta.occurredAt ?? new Date();
    this.aggregateType = meta.aggregateType;
    this.aggregateId = meta.aggregateId;
    this.merchantId = meta.merchantId ?? null;
    this.payload = payload;
  }
}
