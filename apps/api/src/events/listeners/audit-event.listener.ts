import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent } from "../base/domain-event.base.js";
import { ParcelCreatedEvent, ParcelDeliveredEvent, ParcelFailedEvent } from "../domain/parcel.events.js";
import { PayoutRequestedEvent, PayoutCompletedEvent } from "../domain/finance.events.js";

/**
 * Decoupled audit listener reacting to in-process domain events.
 */
@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  @OnEvent("parcel.created")
  handleParcelCreated(event: ParcelCreatedEvent): void {
    this.logger.log(
      `AUDIT [ParcelCreated] code=${event.payload.trackingCode} recipient=${event.payload.recipientName} cod=${event.payload.codAmount} merchant=${event.merchantId}`,
    );
  }

  @OnEvent("parcel.delivered")
  handleParcelDelivered(event: ParcelDeliveredEvent): void {
    this.logger.log(
      `AUDIT [ParcelDelivered] code=${event.payload.trackingCode} rider=${event.payload.riderId} codCollected=${event.payload.codCollected}`,
    );
  }

  @OnEvent("parcel.failed")
  handleParcelFailed(event: ParcelFailedEvent): void {
    this.logger.warn(
      `AUDIT [ParcelFailed] code=${event.payload.trackingCode} rider=${event.payload.riderId} reason=${event.payload.reason}`,
    );
  }

  @OnEvent("finance.payout_requested")
  handlePayoutRequested(event: PayoutRequestedEvent): void {
    this.logger.log(
      `AUDIT [PayoutRequested] id=${event.payload.payoutId} amountPaisa=${event.payload.amountPaisa} method=${event.payload.paymentMethod} merchant=${event.merchantId}`,
    );
  }

  @OnEvent("finance.payout_completed")
  handlePayoutCompleted(event: PayoutCompletedEvent): void {
    this.logger.log(
      `AUDIT [PayoutCompleted] id=${event.payload.payoutId} amountPaisa=${event.payload.amountPaisa} ref=${event.payload.transactionRef ?? "none"}`,
    );
  }

  @OnEvent("domain.*")
  handleAnyDomainEvent(event: DomainEvent): void {
    this.logger.debug(
      `TRACE [DomainEvent] name=${event.eventName} type=${event.eventType} id=${event.eventId} aggregate=${event.aggregateType}/${event.aggregateId}`,
    );
  }
}
