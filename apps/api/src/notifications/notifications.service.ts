import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type FindOptionsWhere } from "typeorm";
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from "../database/entities/index.js";
import {
  type CreateNotificationDto,
  type NotificationItem,
} from "@dhruto/contracts";
import { getErrorMessage } from "../common/utils/error.util.js";
import { SmsService } from "./services/sms.service.js";
import { EmailService } from "./services/email.service.js";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creates and dispatches a notification across specified channel.
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      merchantId: dto.merchantId || null,
      userId: dto.userId || null,
      channel: dto.channel,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      recipientTarget: dto.recipientTarget || null,
      status: NotificationStatus.SENT,
      metadata: dto.metadata || null,
      sentAt: new Date(),
    });

    // Channel-specific delivery
    if (dto.channel === NotificationChannel.SMS && dto.recipientTarget) {
      const normalized = this.smsService.normalizePhoneNumber(dto.recipientTarget);
      notification.recipientTarget = normalized;
      try {
        await this.smsService.sendSms(normalized, dto.message);
      } catch (err) {
        notification.status = NotificationStatus.FAILED;
        notification.failureReason = getErrorMessage(err, "SMS delivery failed");
      }
    } else if (dto.channel === NotificationChannel.EMAIL && dto.recipientTarget) {
      try {
        await this.emailService.sendEmail(dto.recipientTarget, dto.title, dto.message);
      } catch (err) {
        notification.status = NotificationStatus.FAILED;
        notification.failureReason = getErrorMessage(err, "Email delivery failed");
      }
    }

    await this.notificationRepo.save(notification);
    this.logger.log(`Created notification [${notification.channel}:${notification.type}] for recipient "${dto.recipientTarget || dto.merchantId}"`);

    return notification;
  }

  /**
   * Retrieves merchant in-app notifications.
   */
  async getMerchantNotifications(
    merchantId: string,
    limit = 20,
    unreadOnly = false,
  ): Promise<NotificationItem[]> {
    const query = this.notificationRepo
      .createQueryBuilder("n")
      .where("n.merchant_id = :merchantId", { merchantId });

    if (unreadOnly) {
      query.andWhere("n.status != :readStatus", { readStatus: NotificationStatus.READ });
    }

    query.orderBy("n.createdAt", "DESC").take(limit);

    const items = await query.getMany();

    return items.map((n) => ({
      id: n.id,
      merchantId: n.merchantId || undefined,
      userId: n.userId || undefined,
      channel: n.channel,
      type: n.type,
      title: n.title,
      message: n.message,
      recipientTarget: n.recipientTarget || undefined,
      status: n.status,
      metadata: n.metadata || undefined,
      sentAt: n.sentAt?.toISOString(),
      readAt: n.readAt?.toISOString(),
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Returns count of unread notifications for merchant.
   */
  async getUnreadCount(merchantId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        merchantId,
        status: NotificationStatus.SENT,
      },
    });
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(notificationId: string, merchantId?: string): Promise<Notification> {
    const where: FindOptionsWhere<Notification> = { id: notificationId };
    if (merchantId) {
      where.merchantId = merchantId;
    }

    const notification = await this.notificationRepo.findOne({
      where,
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  /**
   * Marks all merchant notifications as read.
   */
  async markAllAsRead(merchantId: string): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({
        status: NotificationStatus.READ,
        readAt: new Date(),
      })
      .where("merchant_id = :merchantId", { merchantId })
      .andWhere("status != :readStatus", { readStatus: NotificationStatus.READ })
      .execute();

    return { updatedCount: result.affected || 0 };
  }

  /**
   * Helper: Dispatches Out for Delivery SMS and merchant in-app notification.
   */
  async notifyOutForDelivery(
    parcelId: string,
    trackingCode: string,
    recipientPhone: string,
    otp: string,
    merchantId?: string,
  ): Promise<void> {
    // 1. Send SMS to recipient with OTP
    await this.createNotification({
      merchantId,
      channel: NotificationChannel.SMS,
      type: NotificationType.DELIVERY_OTP,
      title: "Delivery OTP Code",
      message: `Dhruto Express: Your parcel ${trackingCode} is out for delivery. Share OTP ${otp} with your delivery rider to confirm receipt.`,
      recipientTarget: recipientPhone,
      metadata: { parcelId, trackingCode, otp },
    });

    // 2. In-app notification to merchant
    if (merchantId) {
      await this.createNotification({
        merchantId,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.PARCEL_STATUS_UPDATE,
        title: "Parcel Out for Delivery",
        message: `Parcel ${trackingCode} is currently with rider and out for delivery.`,
        metadata: { parcelId, trackingCode },
      });
    }
  }

  /**
   * Helper: Dispatches delivery completion notice.
   */
  async notifyDeliveryComplete(
    parcelId: string,
    trackingCode: string,
    recipientPhone: string,
    codCollected: number,
    merchantId?: string,
  ): Promise<void> {
    // 1. SMS to recipient
    await this.createNotification({
      merchantId,
      channel: NotificationChannel.SMS,
      type: NotificationType.PARCEL_STATUS_UPDATE,
      title: "Parcel Delivered",
      message: `Dhruto Express: Parcel ${trackingCode} delivered successfully! COD Collected: ৳${codCollected.toLocaleString()}.`,
      recipientTarget: recipientPhone,
      metadata: { parcelId, trackingCode, codCollected },
    });

    // 2. In-app notification to merchant
    if (merchantId) {
      await this.createNotification({
        merchantId,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.CASH_COLLECTED,
        title: "COD Collected & Delivered",
        message: `Parcel ${trackingCode} delivered! ৳${codCollected.toLocaleString()} COD collected and placed in clearance.`,
        metadata: { parcelId, trackingCode, codCollected },
      });
    }
  }
}
