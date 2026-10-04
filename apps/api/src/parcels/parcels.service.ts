import { Injectable, Logger } from "@nestjs/common";
import {
  type ParcelBooking,
  type ParcelCreatedResponse,
  ParcelStatus,
} from "@dhruto/contracts";
import { randomUUID } from "node:crypto";

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  /**
   * Calculates delivery fee based on weight according to Bangladesh logistics rules:
   * Base fee: 60 BDT for up to 1 kg
   * Additional: 20 BDT per kg thereafter
   */
  calculateDeliveryFee(weightKg: number): number {
    const baseFee = 60;
    if (weightKg <= 1) {
      return baseFee;
    }
    const extraKg = Math.ceil(weightKg - 1);
    return baseFee + extraKg * 20;
  }

  /**
   * Generates a canonical tracking code: DHR-YYYYMMDD-XXXX
   */
  private generateTrackingCode(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `DHR-${dateStr}-${randomHex}`;
  }

  /**
   * Creates a new parcel booking.
   * Architecture note: This service is structured for future TypeORM repository injection
   * without altering the controller or API contract.
   */
  async createParcel(booking: ParcelBooking): Promise<ParcelCreatedResponse> {
    this.logger.log(
      `Creating parcel booking for recipient "${booking.recipientName}" in district "${booking.district}"`,
    );

    const deliveryFee = this.calculateDeliveryFee(booking.weight);
    const trackingCode = this.generateTrackingCode();
    const parcelId = randomUUID();
    const createdAt = new Date().toISOString();

    const response: ParcelCreatedResponse = {
      id: parcelId,
      trackingCode,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      district: booking.district,
      thana: booking.thana,
      deliveryAddress: booking.deliveryAddress,
      codAmount: Number(booking.codAmount),
      weight: Number(booking.weight),
      deliveryFee,
      status: ParcelStatus.CREATED,
      createdAt,
    };

    return response;
  }
}
