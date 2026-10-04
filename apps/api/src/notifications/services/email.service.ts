import { Injectable, Logger } from "@nestjs/common";

export interface EmailSendResult {
  success: boolean;
  messageId: string;
  recipient: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(to: string, subject: string, bodyText: string, htmlBody?: string): Promise<EmailSendResult> {
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(
      `[EMAIL-SERVICE] Dispatched Email to "${to}" [${subject}] (ID: ${messageId}, len: ${bodyText?.length || 0}, html: ${!!htmlBody})`,
    );

    return {
      success: true,
      messageId,
      recipient: to,
    };
  }

  async sendPayoutDisbursed(
    to: string,
    merchantName: string,
    amount: number,
    channel: string,
    reference: string,
  ): Promise<EmailSendResult> {
    const subject = `[Dhruto Finance] Payout Disbursed — ৳${amount.toLocaleString()} via ${channel}`;
    const text = `Hello ${merchantName},\n\nYour payout withdrawal of ৳${amount.toLocaleString()} has been successfully processed and transferred to your ${channel} account.\nTransaction Reference: ${reference}\n\nThank you for choosing Dhruto Express.`;
    return this.sendEmail(to, subject, text);
  }
}
