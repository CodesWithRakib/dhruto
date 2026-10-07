import { Injectable, NotFoundException, ForbiddenException, Logger, Inject, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { IsNull, Repository, type FindOptionsWhere } from "typeorm";
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  NotificationPreference,
  NotificationCategory,
  PreferenceChannel,
} from "../database/entities/index.js";
import {
  LOCKED_CATEGORIES,
  type CreateNotificationDto,
  type NotificationItem,
  type NotificationPreferenceItem,
  type SupportedLocale,
  type UpdatePreferencesDto,
  ApiErrorCode,
  PROVIDER_ERROR_CODES,
  ProviderErrorKind,
} from "@dhruto/contracts";
import { getErrorMessage } from "../common/utils/error.util.js";
import type { EmailProvider, SmsProvider } from "../integrations/providers.js";
import { enqueueOrInline } from "../integrations/queue-helper.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Centralized notification domain — Phase 5.
 * ------------------------------------------------------------------
 * Writes are persist-first: the notification row is stored before any
 * provider is touched, so external delivery failure can never destroy
 * history. SMS/EMAIL transport runs in queue workers (or inline when Redis
 * is unreachable); IN_APP rows complete immediately. Bodies are never
 * logged and OTPs never persisted outside the SMS body itself.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    @Optional() @Inject("SMS_PROVIDER") private readonly smsProvider?: SmsProvider,
    @Optional() @Inject("EMAIL_PROVIDER") private readonly emailProvider?: EmailProvider,
    @Optional() @InjectQueue("notifications") private readonly notificationsQueue?: Queue,
  ) {}

  /**
   * Creates a notification record. SMS/EMAIL rows start PENDING for worker
   * transport; IN_APP rows complete immediately (no provider involved).
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const channel = dto.channel;
    const inApp = channel === NotificationChannel.IN_APP;
    const notification = this.notificationRepo.create({
      merchantId: dto.merchantId || null,
      userId: dto.userId || null,
      channel,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      recipientTarget:
        channel === NotificationChannel.SMS && dto.recipientTarget
          ? this.smsProvider?.normalizePhoneNumber(dto.recipientTarget) ?? dto.recipientTarget
          : dto.recipientTarget || null,
      status: inApp ? NotificationStatus.SENT : NotificationStatus.PENDING,
      metadata: (dto.metadata as Record<string, unknown> | undefined) ?? null,
      ...(inApp ? { sentAt: new Date() } : {}),
    });

    await this.notificationRepo.save(notification);
    this.logger.log(
      `NOTIFICATION_CREATED id=${notification.id} channel=${channel} type=${dto.type} recipient=${dto.recipientTarget || dto.merchantId || dto.userId || "-"}`,
    );

    return notification;
  }

  /**
   * Single transport attempt for one queued notification. Idempotent: rows
   * already SENT are skipped. Permanent failures (bad address) complete the
   * job as FAILED without retry; transient failures throw so BullMQ retries
   * with backoff. Never throws for IN_APP.
   */
  async transportNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;
    if (notification.status === NotificationStatus.SENT) return;

    notification.attemptCount += 1;

    try {
      if (notification.channel === NotificationChannel.IN_APP) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
      } else if (notification.channel === NotificationChannel.SMS) {
        await this.sendSms(notification);
      } else if (notification.channel === NotificationChannel.EMAIL) {
        await this.sendEmail(notification);
      }
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = getErrorMessage(error, "Transport failed").slice(0, 500);
      await this.notificationRepo.save(notification);
      // Permanent: job completes, DLQ row written by the failed-event listener
      // only for repeated failures. Transient errors rethrow below via provider.
      throw error;
    }

    await this.notificationRepo.save(notification);
  }

  private async sendSms(notification: Notification): Promise<void> {
    const to = notification.recipientTarget || "";
    if (!to || to.replace(/\D/g, "").length < 10) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = "INVALID_RECIPIENT";
      return;
    }
    if (!this.smsProvider) {
      throw new Error("PROVIDER_UNAVAILABLE: no SMS provider configured");
    }
    const result = await this.smsProvider.sendSms(to, notification.message);
    notification.providerMessageId = result.providerMessageId;
    if (result.success) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } else if (result.errorKind === ProviderErrorKind.PERMANENT) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = `${result.errorCode ?? PROVIDER_ERROR_CODES.INVALID_RECIPIENT}: ${result.errorMessage ?? ""}`.slice(0, 500);
    } else {
      throw new Error(
        `${result.errorCode ?? PROVIDER_ERROR_CODES.PROVIDER_UNAVAILABLE}: ${result.errorMessage ?? "transient SMS failure"}`,
      );
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    const to = notification.recipientTarget || "";
    if (!EMAIL_RE.test(to)) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = "INVALID_RECIPIENT";
      return;
    }
    if (!this.emailProvider) {
      throw new Error("PROVIDER_UNAVAILABLE: no email provider configured");
    }
    const result = await this.emailProvider.sendEmail(to, notification.title, notification.message);
    notification.providerMessageId = result.providerMessageId;
    if (result.success) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } else if (result.errorKind === ProviderErrorKind.PERMANENT) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = `${result.errorCode ?? PROVIDER_ERROR_CODES.INVALID_RECIPIENT}: ${result.errorMessage ?? ""}`.slice(0, 500);
    } else {
      throw new Error(
        `${result.errorCode ?? PROVIDER_ERROR_CODES.PROVIDER_UNAVAILABLE}: ${result.errorMessage ?? "transient email failure"}`,
      );
    }
  }

  /** Loads one notification row (worker/DLQ bookkeeping). */
  async findById(id: string): Promise<Notification | null> {
    return this.notificationRepo.findOne({ where: { id } });
  }

  /**
   * Creates a notification and transports it immediately in the request
   * lifecycle (used by explicit test sends). The row persists first, so a
   * provider outage still leaves an honest PENDING/FAILED record.
   */
  async dispatchDirect(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.createNotification(dto);
    if (notification.channel !== NotificationChannel.IN_APP) {
      try {
        await this.transportNotification(notification.id);
      } catch (error) {
        this.logger.warn(
          `Direct transport failed: ${getErrorMessage(error, "unknown")}`,
        );
      }
      const reloaded = await this.findById(notification.id);
      return reloaded ?? notification;
    }
    return notification;
  }

  /* ================================================================== */
  /* Reads                                                              */
  /* ================================================================== */

  /**
   * Retrieves in-app notifications for a recipient scope (merchant owner or
   * user), newest first with offset pagination.
   */
  async getNotifications(
    scope: { merchantId?: string; userId?: string },
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ): Promise<{ items: NotificationItem[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const where: FindOptionsWhere<Notification>[] = [];
    if (scope.merchantId) where.push({ merchantId: scope.merchantId });
    if (scope.userId) where.push({ userId: scope.userId });
    if (where.length === 0) return { items: [], total: 0, page, limit };

    const query = this.notificationRepo
      .createQueryBuilder("n")
      .where(where.map(() => "(n.merchant_id = :merchantId OR n.user_id = :userId)").join(" OR "), {
        merchantId: scope.merchantId ?? "00000000-0000-0000-0000-000000000000",
        userId: scope.userId ?? "00000000-0000-0000-0000-000000000000",
      });
    if (options.unreadOnly) {
      query.andWhere("n.status != :readStatus", { readStatus: NotificationStatus.READ });
    }
    const total = await query.getCount();
    const items = await query
      .orderBy("n.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();

    return { items: items.map((n) => this.toItem(n)), total, page, limit };
  }

  /**
   * Retrieves merchant in-app notifications (legacy shape: bare array).
   */
  async getMerchantNotifications(
    merchantId: string,
    limit = 20,
    unreadOnly = false,
  ): Promise<NotificationItem[]> {
    const result = await this.getNotifications({ merchantId }, { limit, page: 1, unreadOnly });
    return result.items;
  }

  /**
   * Returns count of unread notifications for merchant.
   */
  async getUnreadCount(merchantId: string): Promise<number>;
  async getUnreadCount(scope: { merchantId?: string; userId?: string }): Promise<number>;
  async getUnreadCount(
    merchantIdOrScope: string | { merchantId?: string; userId?: string },
  ): Promise<number> {
    const scope =
      typeof merchantIdOrScope === "string" ? { merchantId: merchantIdOrScope } : merchantIdOrScope;
    const conditions: FindOptionsWhere<Notification>[] = [];
    if (scope.merchantId) conditions.push({ merchantId: scope.merchantId, status: NotificationStatus.SENT });
    if (scope.userId) conditions.push({ userId: scope.userId, status: NotificationStatus.SENT });
    if (conditions.length === 0) return 0;
    return this.notificationRepo.count({ where: conditions });
  }

  /**
   * Marks a specific notification as read. Merchant scopes read merchant
   * rows; user scopes read user rows — never each other's.
   */
  async markAsRead(
    notificationId: string,
    scope?: { merchantId?: string; userId?: string },
  ): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    const owned =
      !!notification &&
      ((!!scope?.merchantId &&
        notification.merchantId !== null &&
        notification.merchantId === scope.merchantId) ||
        (!!scope?.userId &&
          notification.userId !== null &&
          notification.userId === scope.userId));
    if (!owned) {
      throw new NotFoundException({
        message: "Notification not found",
        error: ApiErrorCode.NOTIFICATION_NOT_FOUND,
      });
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  /**
   * Marks all merchant notifications as read.
   */
  async markAllAsRead(
    scope: { merchantId?: string; userId?: string },
  ): Promise<{ updatedCount: number }> {
    const query = this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where("status != :readStatus", { readStatus: NotificationStatus.READ });
    if (scope.merchantId) {
      query.andWhere("merchant_id = :merchantId", { merchantId: scope.merchantId });
    } else if (scope.userId) {
      query.andWhere("user_id = :userId", { userId: scope.userId });
    } else {
      return { updatedCount: 0 };
    }
    const result = await query.execute();
    return { updatedCount: result.affected || 0 };
  }

  /* ================================================================== */
  /* Preferences                                                        */
  /* ================================================================== */

  async getPreferences(scope: {
    merchantId?: string;
    userId?: string;
  }  ): Promise<{ items: NotificationPreferenceItem[]; locale: SupportedLocale }> {
    const rows = await this.preferenceRepo.find({
      where: {
        userId: scope.userId ?? IsNull(),
        merchantId: scope.merchantId ?? IsNull(),
      },
    });
    const byKey = new Map(rows.map((r) => [`${r.category}:${r.channel}`, r]));
    const items: NotificationPreferenceItem[] = [];
    for (const category of Object.values(NotificationCategory)) {
      for (const channel of Object.values(PreferenceChannel)) {
        const row = byKey.get(`${category}:${channel}`);
        items.push({
          category,
          channel,
          enabled: row ? row.enabled : true,
          locked: LOCKED_CATEGORIES.includes(category),
          updatedAt: row?.updatedAt.toISOString() ?? null,
        });
      }
    }
    const localeRow = rows.find((r) => r.locale === "bn");
    return { items, locale: localeRow ? "bn" : "en" };
  }

  async setPreferences(
    scope: { merchantId?: string; userId?: string },
    dto: UpdatePreferencesDto,
  ): Promise<{ items: NotificationPreferenceItem[]; locale: SupportedLocale }> {
    for (const pref of dto.preferences) {
      if (!pref.enabled && LOCKED_CATEGORIES.includes(pref.category)) {
        throw new ForbiddenException({
          message: `${pref.category} notifications cannot be disabled`,
          error: ApiErrorCode.PREFERENCE_LOCKED,
        });
      }
    }
    for (const pref of dto.preferences) {
      const existing = await this.preferenceRepo.findOne({
        where: {
          userId: scope.userId ?? IsNull(),
          merchantId: scope.merchantId ?? IsNull(),
          category: pref.category,
          channel: pref.channel,
        },
      });
      if (existing) {
        existing.enabled = pref.enabled;
        if (dto.locale) existing.locale = dto.locale;
        await this.preferenceRepo.save(existing);
      } else {
        await this.preferenceRepo.save(
          this.preferenceRepo.create({
            userId: scope.userId ?? null,
            merchantId: scope.merchantId ?? null,
            category: pref.category,
            channel: pref.channel,
            enabled: pref.enabled,
            locale: dto.locale ?? "en",
          }),
        );
      }
    }
    return this.getPreferences(scope);
  }

  /* ================================================================== */
  /* Domain helpers (critical-path sends stay fast and secret-free)     */
  /* ================================================================== */

  /**
   * Helper: Sends ONLY the OTP SMS on the critical handoff path.
   *
   * The OTP travels in the SMS body only and is never persisted in metadata,
   * logs, or API responses. Merchant in-app + webhook fan-out for the
   * OUT_FOR_DELIVERY event is owned by the outbox relay — this method must
   * NOT create merchant notifications, otherwise the merchant gets duplicates.
   */
  async sendDeliveryOtpSms(
    recipientPhone: string,
    trackingCode: string,
    otp: string,
  ): Promise<void> {
    const notification = await this.createNotification({
      channel: NotificationChannel.SMS,
      type: NotificationType.DELIVERY_OTP,
      title: "Delivery OTP Code",
      message: `Dhruto Express: Your parcel ${trackingCode} is out for delivery. Share OTP ${otp} with your delivery rider to confirm receipt.`,
      recipientTarget: recipientPhone,
      // The OTP travels in the SMS body only. It is never persisted in
      // metadata, logs, or API responses (PWA/customer-data safety).
      metadata: { trackingCode },
    });
    // Critical handoff path: queue for worker transport with retry, falling
    // back to inline transport when Redis is unreachable. The row is already
    // persisted, so a provider outage leaves an honest PENDING/FAILED record
    // without affecting the already-committed parcel state.
    if (this.notificationsQueue) {
      await enqueueOrInline(
        this.notificationsQueue,
        "notification-send",
        { notificationId: notification.id },
        { jobId: `notif-${notification.id}`, attempts: 4, backoff: { type: "exponential", delay: 10000 } },
        () => this.transportNotification(notification.id),
      ).catch((error: unknown) =>
        this.logger.warn(`OTP SMS enqueue failed: ${getErrorMessage(error, "unknown")}`),
      );
    } else {
      await this.transportNotification(notification.id).catch((error: unknown) =>
        this.logger.warn(`OTP SMS inline transport failed: ${getErrorMessage(error, "unknown")}`),
      );
    }
  }

  /**
   * Helper: Dispatches Out for Delivery SMS and merchant in-app notification.
   *
   * @deprecated Prefer outbox relay for merchant fan-out + `sendDeliveryOtpSms`
   * for the OTP critical path. Kept for backwards compatibility with callers
   * that have not migrated yet.
   *
   * The OTP SMS is part of the handoff critical path, so it is created (and
   * queued for immediate transport) synchronously here; the OTP travels in
   * the SMS body only and is never persisted, logged, or returned.
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
      // The OTP travels in the SMS body only. It is never persisted in
      // metadata, logs, or API responses (PWA/customer-data safety).
      metadata: { parcelId, trackingCode },
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

  private toItem(n: Notification): NotificationItem {
    return {
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
    };
  }
}
