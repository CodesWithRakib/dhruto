import { Injectable, Logger } from "@nestjs/common";

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  recipient: string;
  provider: string;
  parts: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Normalizes Bangladesh phone number to +8801XXXXXXXXX standard.
   */
  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+880")) return cleaned;
    if (cleaned.startsWith("880")) return `+${cleaned}`;
    if (cleaned.startsWith("01")) return `+88${cleaned}`;
    return cleaned;
  }

  /**
   * Dispatches SMS message to recipient via simulated BD SMS gateway (SSL Wireless / Greenweb compatible).
   */
  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const normalizedPhone = this.normalizePhoneNumber(to);
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // In a live environment with API credentials, this executes an HTTP POST to SMS gateway
    this.logger.log(`[SMS-GATEWAY] Dispatched SMS to "${normalizedPhone}" (ID: ${messageId}): "${message}"`);

    return {
      success: true,
      messageId,
      recipient: normalizedPhone,
      provider: "Dhruto-Telecom-Gateway",
      parts: Math.ceil(message.length / 160) || 1,
    };
  }

  /**
   * Sends delivery verification OTP to recipient.
   */
  async sendDeliveryOtp(phone: string, otp: string, trackingCode: string): Promise<SmsSendResult> {
    const message = `Dhruto Express: Your parcel ${trackingCode} is out for delivery. Share OTP ${otp} with your delivery rider to receive your parcel.`;
    return this.sendSms(phone, message);
  }

  /**
   * Sends parcel pickup confirmation.
   */
  async sendPickupNotice(phone: string, trackingCode: string): Promise<SmsSendResult> {
    const message = `Dhruto Express: Your shipment ${trackingCode} has been picked up and is in transit to the sorting hub. Track at dhruto.com/track?code=${trackingCode}`;
    return this.sendSms(phone, message);
  }

  /**
   * Sends successful delivery & COD receipt notice.
   */
  async sendDeliveryReceipt(phone: string, trackingCode: string, codAmount: number): Promise<SmsSendResult> {
    const message = `Dhruto Express: Parcel ${trackingCode} delivered successfully! COD Collected: ৳${codAmount.toLocaleString()}. Thank you for shipping with Dhruto.`;
    return this.sendSms(phone, message);
  }
}
