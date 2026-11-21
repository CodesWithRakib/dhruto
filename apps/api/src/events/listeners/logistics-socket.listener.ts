import { Injectable, Logger, Optional } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  ParcelCreatedEvent,
  ParcelAssignedEvent,
  ParcelOutForDeliveryEvent,
  ParcelDeliveredEvent,
  ParcelFailedEvent,
  ParcelReturnedEvent,
} from "../domain/parcel.events.js";
import { NotificationsGateway } from "../../notifications/gateways/notifications.gateway.js";

/**
 * Real-time logistics socket dispatcher.
 * Broadcasts parcel lifecycle transitions directly to connected merchant, hub,
 * rider, and admin socket rooms so dashboards update with zero polling.
 */
@Injectable()
export class LogisticsSocketListener {
  private readonly logger = new Logger(LogisticsSocketListener.name);

  constructor(@Optional() private readonly gateway?: NotificationsGateway) {}

  @OnEvent("parcel.created")
  handleParcelCreated(event: ParcelCreatedEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "CREATED",
      recipientName: event.payload.recipientName,
      codAmount: event.payload.codAmount,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.created -> ${event.payload.trackingCode}`);
  }

  @OnEvent("parcel.assigned")
  handleParcelAssigned(event: ParcelAssignedEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "ASSIGNED_TO_RIDER",
      riderId: event.payload.riderId,
      hubId: event.payload.hubId,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.payload.riderId) {
      this.gateway?.emitToRider(event.payload.riderId, "parcel:status_changed", payload);
    }
    if (event.payload.hubId) {
      this.gateway?.emitToHub(event.payload.hubId, "parcel:status_changed", payload);
    }
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.assigned -> ${event.payload.trackingCode}`);
  }

  @OnEvent("parcel.out_for_delivery")
  handleParcelOutForDelivery(event: ParcelOutForDeliveryEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "OUT_FOR_DELIVERY",
      riderId: event.payload.riderId,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.payload.riderId) {
      this.gateway?.emitToRider(event.payload.riderId, "parcel:status_changed", payload);
    }
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.out_for_delivery -> ${event.payload.trackingCode}`);
  }

  @OnEvent("parcel.delivered")
  handleParcelDelivered(event: ParcelDeliveredEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "DELIVERED",
      riderId: event.payload.riderId,
      codCollected: event.payload.codCollected,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    if (event.payload.riderId) {
      this.gateway?.emitToRider(event.payload.riderId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.delivered -> ${event.payload.trackingCode}`);
  }

  @OnEvent("parcel.failed")
  handleParcelFailed(event: ParcelFailedEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "DELIVERY_ATTEMPTED",
      riderId: event.payload.riderId,
      reason: event.payload.reason,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    if (event.payload.riderId) {
      this.gateway?.emitToRider(event.payload.riderId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.failed -> ${event.payload.trackingCode}`);
  }

  @OnEvent("parcel.returned")
  handleParcelReturned(event: ParcelReturnedEvent): void {
    const payload = {
      parcelId: event.payload.parcelId,
      trackingCode: event.payload.trackingCode,
      status: "RETURNED_TO_MERCHANT",
      hubId: event.payload.hubId,
      merchantId: event.merchantId,
      timestamp: new Date().toISOString(),
    };
    if (event.merchantId) {
      this.gateway?.emitToMerchant(event.merchantId, "parcel:status_changed", payload);
    }
    if (event.payload.hubId) {
      this.gateway?.emitToHub(event.payload.hubId, "parcel:status_changed", payload);
    }
    this.gateway?.emitToRole("ADMIN", "parcel:status_changed", payload);
    this.logger.debug(`[SOCKET] Broadcast parcel.returned -> ${event.payload.trackingCode}`);
  }
}
