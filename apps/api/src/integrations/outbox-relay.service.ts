import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { DataSource, EntityManager, IsNull, Repository } from "typeorm";
import {
  DomainEventType,
  LOCKED_CATEGORIES,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  PreferenceChannel,
  WebhookEvent,
  type RenderedTemplate,
  type SupportedLocale,
} from "@dhruto/contracts";
import {
  EventOutbox,
  HubUserAssignment,
  Merchant,
  Notification,
  NotificationPreference,
  Rider,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookSubscription,
} from "../database/entities/index.js";
import { OutboxService } from "./outbox.service.js";
import { WebhooksService } from "../webhooks/webhooks.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { enqueueOrInline } from "./queue-helper.js";
import {
  renderCashVerified,
  renderDiscrepancyOpened,
  renderHandInSubmitted,
  renderParcelAssigned,
  renderParcelCreated,
  renderParcelDelivered,
  renderParcelFailed,
  renderParcelOutForDelivery,
  renderParcelReturned,
  renderPayoutApproved,
  renderPayoutCompleted,
  renderPayoutFailed,
  renderPayoutRequested,
  renderSettlementCreated,
  type TemplateKey,
} from "../notifications/templates.js";
import { getErrorMessage } from "../common/utils/error.util.js";

type Payload = Record<string, unknown>;

interface BaseTarget {
  category: NotificationCategory;
  type: NotificationType;
  templateKey: TemplateKey;
}

interface MerchantInAppTarget extends BaseTarget {
  kind: "merchant-inapp";
  route: (payload: Payload) => string;
}

interface MerchantEmailTarget extends BaseTarget {
  kind: "merchant-email";
}

interface MerchantSmsTarget extends BaseTarget {
  kind: "merchant-sms";
}

interface CustomerSmsTarget extends BaseTarget {
  kind: "customer-sms";
}

interface RiderInAppTarget extends BaseTarget {
  kind: "rider-inapp";
  route: (payload: Payload) => string;
}

interface HubInAppTarget extends BaseTarget {
  kind: "hub-inapp";
  route: (payload: Payload) => string;
}

interface WebhookTarget {
  kind: "webhook";
  event: WebhookEvent;
}

interface ResolvedRecipient {
  key: string;
  merchantId: string | null;
  userId: string | null;
  target: string | null;
  route: string | null;
}

type FanoutTarget =
  | MerchantInAppTarget
  | MerchantEmailTarget
  | MerchantSmsTarget
  | CustomerSmsTarget
  | RiderInAppTarget
  | HubInAppTarget
  | WebhookTarget;

interface ResolvedRecipient {
  key: string;
  merchantId: string | null;
  userId: string | null;
  target: string | null;
  route: string | null;
}

/**
 * Who gets told what, per domain event. Financial and security categories
 * are locked on; parcel updates can be disabled per channel in preferences.
 */
const FANOUT: Readonly<Record<DomainEventType, readonly FanoutTarget[]>> = {
  [DomainEventType.PARCEL_CREATED]: [
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_created", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "merchant-email", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_created" },
    { kind: "webhook", event: WebhookEvent.PARCEL_CREATED },
  ],
  [DomainEventType.PARCEL_ASSIGNED]: [
    { kind: "rider-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_assigned", route: (p) => `/rider/tasks/${String(p.parcelId)}` },
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_assigned", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "webhook", event: WebhookEvent.PARCEL_ASSIGNED },
  ],
  [DomainEventType.PARCEL_OUT_FOR_DELIVERY]: [
    // NOTE: no customer-sms here by design. The customer is notified on the
    // critical handoff path via the OTP SMS (sendDeliveryOtpSms), which
    // already states the parcel is out for delivery AND carries the code the
    // generic template lacks. Adding a generic customer-sms here would send a
    // second, code-less duplicate for every fresh OTP leg.
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_out_for_delivery", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "webhook", event: WebhookEvent.PARCEL_OUT_FOR_DELIVERY },
  ],
  [DomainEventType.PARCEL_DELIVERED]: [
    { kind: "customer-sms", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_delivered" },
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_delivered", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "merchant-email", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_delivered" },
    { kind: "webhook", event: WebhookEvent.PARCEL_DELIVERED },
  ],
  [DomainEventType.PARCEL_FAILED]: [
    { kind: "customer-sms", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_failed" },
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_failed", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "rider-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_failed", route: (p) => `/rider/tasks/${String(p.parcelId)}` },
    { kind: "webhook", event: WebhookEvent.PARCEL_FAILED },
  ],
  [DomainEventType.PARCEL_RETURNED]: [
    { kind: "merchant-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "parcel_returned", route: (p) => `/merchant/parcels/${String(p.parcelId)}` },
    { kind: "webhook", event: WebhookEvent.PARCEL_RETURNED },
  ],
  [DomainEventType.CASH_HAND_IN_SUBMITTED]: [
    { kind: "hub-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "cash_hand_in_submitted", route: () => "/hub/cash" },
    { kind: "rider-inapp", category: NotificationCategory.PARCEL_UPDATES, type: NotificationType.PARCEL_STATUS_UPDATE, templateKey: "cash_hand_in_submitted", route: () => "/rider/profile" },
  ],
  [DomainEventType.CASH_VERIFIED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.CASH_COLLECTED, templateKey: "cash_verified", route: () => "/merchant/finance" },
    { kind: "merchant-email", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.CASH_COLLECTED, templateKey: "cash_verified" },
    { kind: "webhook", event: WebhookEvent.CASH_VERIFIED },
  ],
  [DomainEventType.SETTLEMENT_CREATED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.CASH_COLLECTED, templateKey: "settlement_created", route: () => "/merchant/finance" },
    { kind: "webhook", event: WebhookEvent.SETTLEMENT_CREATED },
  ],
  [DomainEventType.PAYOUT_REQUESTED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_requested", route: () => "/merchant/finance" },
    { kind: "merchant-email", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_requested" },
    { kind: "webhook", event: WebhookEvent.PAYOUT_REQUESTED },
  ],
  [DomainEventType.PAYOUT_APPROVED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_approved", route: () => "/merchant/finance" },
    { kind: "webhook", event: WebhookEvent.PAYOUT_APPROVED },
  ],
  [DomainEventType.PAYOUT_COMPLETED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_completed", route: () => "/merchant/finance" },
    { kind: "merchant-email", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_completed" },
    { kind: "webhook", event: WebhookEvent.PAYOUT_COMPLETED },
  ],
  [DomainEventType.PAYOUT_FAILED]: [
    { kind: "merchant-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_failed", route: () => "/merchant/finance" },
    { kind: "merchant-email", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.PAYOUT_UPDATE, templateKey: "payout_failed" },
    { kind: "webhook", event: WebhookEvent.PAYOUT_FAILED },
  ],
  [DomainEventType.DISCREPANCY_OPENED]: [
    { kind: "hub-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.CASH_COLLECTED, templateKey: "discrepancy_opened", route: () => "/hub/cash" },
    { kind: "rider-inapp", category: NotificationCategory.FINANCIAL_UPDATES, type: NotificationType.CASH_COLLECTED, templateKey: "discrepancy_opened", route: () => "/rider/profile" },
  ],
  [DomainEventType.DISCREPANCY_RESOLVED]: [],
};

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function renderTemplate(key: TemplateKey, payload: Payload): RenderedTemplate {
  switch (key) {
    case "parcel_created":
      return renderParcelCreated({ trackingCode: str(payload.trackingCode), recipientName: str(payload.recipientName) });
    case "parcel_assigned":
      return renderParcelAssigned({ trackingCode: str(payload.trackingCode), recipientName: str(payload.recipientName) });
    case "parcel_out_for_delivery":
      return renderParcelOutForDelivery({ trackingCode: str(payload.trackingCode) });
    case "parcel_delivered":
      return renderParcelDelivered({ trackingCode: str(payload.trackingCode), codCollected: num(payload.codCollected) });
    case "parcel_failed":
      return renderParcelFailed({ trackingCode: str(payload.trackingCode), reason: str(payload.reason, "unknown") });
    case "parcel_returned":
      return renderParcelReturned({ trackingCode: str(payload.trackingCode), recipientName: str(payload.recipientName) });
    case "cash_hand_in_submitted":
      return renderHandInSubmitted({ handinCode: str(payload.handinCode), itemCount: num(payload.itemCount), totalMinor: num(payload.totalMinor) });
    case "cash_verified":
      return renderCashVerified({ trackingCode: str(payload.trackingCode), netAmount: num(payload.netMinor) / 100, settlementCode: str(payload.settlementCode) });
    case "settlement_created":
      return renderSettlementCreated({ trackingCode: str(payload.trackingCode), netAmount: num(payload.netMinor) / 100, settlementCode: str(payload.settlementCode) });
    case "payout_requested":
      return renderPayoutRequested({ payoutCode: str(payload.payoutCode), amount: num(payload.amountMinor) / 100, method: str(payload.method) });
    case "payout_approved":
      return renderPayoutApproved({ payoutCode: str(payload.payoutCode), amount: num(payload.amountMinor) / 100, method: str(payload.method) });
    case "payout_completed":
      return renderPayoutCompleted({ payoutCode: str(payload.payoutCode), amount: num(payload.amountMinor) / 100, method: str(payload.method) });
    case "payout_failed":
      return renderPayoutFailed({ payoutCode: str(payload.payoutCode), amount: num(payload.amountMinor) / 100, method: str(payload.method) });
    case "discrepancy_opened":
      return renderDiscrepancyOpened({ trackingCode: str(payload.trackingCode), differenceMinor: num(payload.differenceMinor) });
  }
}

/**
 * Outbox relay: claims due events on a timer and fans out to in-app rows,
 * SMS/email transports and merchant webhooks.
 * ------------------------------------------------------------------
 * The relay only writes integration state (notifications, deliveries, queue
 * jobs). Domain rows are never touched here, so a late or duplicate event
 * can never mutate parcel, cash or ledger state (stale-event protection).
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly outbox: OutboxService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Optional() @InjectQueue("notifications") private readonly notificationsQueue?: Queue,
    @Optional() @InjectQueue("webhooks") private readonly webhooksQueue?: Queue,
  ) {}

  onModuleInit(): void {
    const intervalMs = Math.max(500, Number(process.env.OUTBOX_POLL_MS ?? 3000));
    this.logger.log(`Outbox relay polling every ${intervalMs}ms`);
    this.timer = setInterval(() => {
      void this.pollOnce().catch((error: unknown) =>
        this.logger.warn(`Outbox poll failed: ${getErrorMessage(error, "unknown")}`),
      );
    }, intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Single poll iteration (also used directly by tests). */
  async pollOnce(limit = 25): Promise<{ claimed: number; published: number; failed: number }> {
    if (this.running) return { claimed: 0, published: 0, failed: 0 };
    this.running = true;
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const rows = await this.outbox.claimDueBatch(manager, limit);
        let published = 0;
        let failed = 0;
        for (const row of rows) {
          try {
            await this.fanOut(manager, row);
            await this.outbox.markPublished(manager, row.id);
            published += 1;
          } catch (error) {
            await this.outbox.markAttemptFailed(
              manager,
              row.id,
              getErrorMessage(error, "fan-out failed"),
            );
            failed += 1;
          }
        }
        return { claimed: rows.length, published, failed };
      });
      // Queueless fallback: retry due transports inline (with a queue wired,
      // BullMQ owns retries and this sweep stays idle).
      await this.sweepDueTransports();
      return result;
    } finally {
      this.running = false;
    }
  }

  /**
   * Retries due FAILED webhook deliveries and stale PENDING notifications
   * inline. Only active when the matching queue is unwired (Redis down);
   * otherwise BullMQ owns the schedule and this is a no-op.
   */
  private async sweepDueTransports(): Promise<void> {
    const now = new Date();
    if (!this.webhooksQueue) {
      const due = await this.deliveryRepo.find({
        where: {
          status: WebhookDeliveryStatus.FAILED,
        },
        take: 25,
      });
      for (const row of due.filter((d) => d.nextRetryAt && d.nextRetryAt <= now)) {
        try {
          await this.webhooks.attemptDelivery(row.id);
        } catch (error) {
          this.logger.warn(
            `Sweep webhook retry failed: ${getErrorMessage(error, "unknown")}`,
          );
        }
      }
    }
    if (!this.notificationsQueue) {
      const stale = await this.notificationRepo.find({
        where: { status: NotificationStatus.PENDING },
        take: 25,
      });
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const row of stale.filter((n) => n.createdAt.getTime() < cutoff)) {
        try {
          await this.notifications.transportNotification(row.id);
        } catch (error) {
          this.logger.warn(
            `Sweep notification retry failed: ${getErrorMessage(error, "unknown")}`,
          );
        }
      }
    }
  }

  private async fanOut(manager: EntityManager, row: EventOutbox): Promise<void> {
    const eventType = row.eventType as DomainEventType;
    const targets = FANOUT[eventType];
    if (!targets) {
      throw new Error(`No fan-out configured for event ${row.eventType}`);
    }
    const payload = (row.payload ?? {}) as Payload;
    for (const target of targets) {
      if (target.kind === "webhook") {
        await this.fanOutWebhook(manager, row, target.event, payload);
      } else if (target.kind === "hub-inapp") {
        await this.fanOutHubManagers(manager, row, target, payload);
      } else {
        const recipient = await this.resolveRecipient(manager, target, payload);
        if (recipient) {
          await this.deliverNotification(manager, row, target, payload, recipient);
        }
      }
    }
  }

  private async fanOutWebhook(
    manager: EntityManager,
    row: EventOutbox,
    event: WebhookEvent,
    payload: Payload,
  ): Promise<void> {
    const merchantId = typeof payload.merchantId === "string" ? payload.merchantId : null;
    if (!merchantId) return;
    const subs = await manager.getRepository(WebhookSubscription).find({
      where: { merchantId, status: "ACTIVE" },
    });
    const matching = subs.filter((s) => s.events.includes(event) || s.events.includes("*"));
    for (const sub of matching) {
      const delivery = await this.webhooks.createDeliveryForEvent(manager, {
        subscriptionId: sub.id,
        merchantId,
        event,
        eventId: row.eventId,
        data: payload,
      });
      if (this.webhooksQueue) {
        await enqueueOrInline(
          this.webhooksQueue,
          "webhook-delivery",
          { deliveryId: delivery.id },
          { jobId: `webhook-${delivery.id}`, attempts: 3, backoff: { type: "exponential", delay: 15000 } },
          () => this.webhooks.attemptDelivery(delivery.id).then(() => undefined),
        );
      } else {
        await this.webhooks.attemptDelivery(delivery.id).catch((error: unknown) =>
          this.logger.warn(`Inline webhook attempt failed: ${getErrorMessage(error, "unknown")}`),
        );
      }
    }
  }

  /**
   * Hub alerts expand to one in-app row per assigned manager.
   */
  private async fanOutHubManagers(
    manager: EntityManager,
    row: EventOutbox,
    target: HubInAppTarget,
    payload: Payload,
  ): Promise<void> {
    const hubId = typeof payload.hubId === "string" ? payload.hubId : null;
    if (!hubId) return;
    const assignments = await manager.getRepository(HubUserAssignment).find({
      where: { hubId, isActive: true },
    });
    for (const assignment of assignments) {
      await this.deliverNotification(
        manager,
        row,
        { ...target, kind: "rider-inapp" },
        payload,
        {
          key: `user:${assignment.userId}`,
          merchantId: null,
          userId: assignment.userId,
          target: null,
          route: target.route(payload),
        },
      );
    }
  }

  private async resolveRecipient(
    manager: EntityManager,
    target: MerchantInAppTarget | MerchantEmailTarget | MerchantSmsTarget | CustomerSmsTarget | RiderInAppTarget,
    payload: Payload,
  ): Promise<ResolvedRecipient | null> {
    switch (target.kind) {
      case "merchant-inapp":
      case "merchant-email": {
        const merchantId = typeof payload.merchantId === "string" ? payload.merchantId : null;
        if (!merchantId) return null;
        if (target.kind === "merchant-email") {
          const merchant = await manager.getRepository(Merchant).findOne({
            where: { id: merchantId },
            relations: ["user"],
          });
          const email = merchant?.user?.email;
          if (!email) return null;
          return { key: `merchant:${merchantId}`, merchantId, userId: null, target: email, route: null };
        }
        return { key: `merchant:${merchantId}`, merchantId, userId: null, target: null, route: target.route(payload) };
      }
      case "merchant-sms": {
        const merchantId = typeof payload.merchantId === "string" ? payload.merchantId : null;
        const phone = typeof payload.recipientPhone === "string" ? payload.recipientPhone : null;
        if (!merchantId || !phone) return null;
        return { key: `merchant:${merchantId}`, merchantId, userId: null, target: phone, route: null };
      }
      case "customer-sms": {
        const phone = typeof payload.recipientPhone === "string" ? payload.recipientPhone : null;
        if (!phone) return null;
        const merchantId = typeof payload.merchantId === "string" ? payload.merchantId : null;
        return { key: `customer:${phone}`, merchantId, userId: null, target: phone, route: null };
      }
      case "rider-inapp": {
        const riderId = typeof payload.riderId === "string" ? payload.riderId : null;
        if (!riderId) return null;
        const rider = await manager.getRepository(Rider).findOne({ where: { id: riderId } });
        if (!rider) return null;
        return { key: `user:${rider.userId}`, merchantId: null, userId: rider.userId, target: null, route: target.route(payload) };
      }
    }
  }

  private async deliverNotification(
    manager: EntityManager,
    row: EventOutbox,
    target: MerchantInAppTarget | MerchantEmailTarget | MerchantSmsTarget | CustomerSmsTarget | RiderInAppTarget,
    payload: Payload,
    recipient: ResolvedRecipient,
  ): Promise<void> {
    const channel =
      target.kind === "customer-sms" || target.kind === "merchant-sms"
        ? NotificationChannel.SMS
        : target.kind === "merchant-email"
          ? NotificationChannel.EMAIL
          : NotificationChannel.IN_APP;

    const preferenceChannel =
      channel === NotificationChannel.SMS
        ? PreferenceChannel.SMS
        : channel === NotificationChannel.EMAIL
          ? PreferenceChannel.EMAIL
          : PreferenceChannel.IN_APP;
    if (!LOCKED_CATEGORIES.includes(target.category)) {
      const enabled = await this.preferenceEnabled(manager, recipient, target.category, preferenceChannel);
      if (!enabled) {
        this.logger.log(`OUTBOX_SKIP preference off event=${row.eventId} channel=${channel}`);
        return;
      }
    }

    const locale = await this.recipientLocale(manager, recipient);
    const rendered = renderTemplate(target.templateKey, payload);
    const text = locale === "bn" ? rendered.bn : rendered.en;

    const dedupeKey = `${row.eventId}:${channel}:${recipient.key}`;
    const isInApp = channel === NotificationChannel.IN_APP;
    const inserted = await manager
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values({
        merchantId: recipient.merchantId,
        userId: recipient.userId,
        channel,
        type: target.type,
        title: text.title,
        message: text.body,
        recipientTarget: recipient.target,
        status: isInApp ? NotificationStatus.SENT : NotificationStatus.PENDING,
        metadata: {
          eventId: row.eventId,
          eventType: row.eventType,
          ...(recipient.route ? { route: recipient.route } : {}),
        },
        eventId: row.eventId,
        dedupeKey,
        templateKey: target.templateKey,
        locale,
        ...(isInApp ? { sentAt: new Date() } : {}),
      })
      .orIgnore()
      .execute();

    const identifier = inserted.identifiers[0] as { id?: string } | undefined;
    if (!identifier?.id) {
      this.logger.log(`OUTBOX_DEDUP event=${row.eventId} channel=${channel}`);
      return;
    }
    const notificationId: string = identifier.id;

    if (channel !== NotificationChannel.IN_APP) {
      if (this.notificationsQueue) {
        await enqueueOrInline(
          this.notificationsQueue,
          "notification-send",
          { notificationId },
          { jobId: `notif-${notificationId}`, attempts: 4, backoff: { type: "exponential", delay: 10000 } },
          () => this.notifications.transportNotification(notificationId),
        );
      } else {
        await this.notifications.transportNotification(notificationId);
      }
    }
  }

  private async preferenceEnabled(
    manager: EntityManager,
    recipient: ResolvedRecipient,
    category: NotificationCategory,
    channel: PreferenceChannel,
  ): Promise<boolean> {
    // A recipient matches at most one side (merchant rows or user rows).
    const row = await manager.getRepository(NotificationPreference).findOne({
      where: {
        userId: recipient.userId ?? IsNull(),
        merchantId: recipient.merchantId ?? IsNull(),
        category,
        channel,
      },
    });
    return row ? row.enabled : true;
  }

  private async recipientLocale(
    manager: EntityManager,
    recipient: ResolvedRecipient,
  ): Promise<SupportedLocale> {
    const row = await manager.getRepository(NotificationPreference).findOne({
      where: {
        userId: recipient.userId ?? IsNull(),
        merchantId: recipient.merchantId ?? IsNull(),
      },
      select: ["locale"],
    });
    return row?.locale === "bn" ? "bn" : "en";
  }
}
