import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository } from "typeorm";
import {
  IntegrationFailure,
  IntegrationFailureKind,
  IntegrationFailureStatus,
  WebhookDelivery,
  WebhookDeliveryStatus,
} from "../database/entities/index.js";
import { OutboxService } from "./outbox.service.js";
import { WebhooksService } from "../webhooks/webhooks.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { enqueueOrInline, queueCounts } from "./queue-helper.js";
import { getErrorMessage } from "../common/utils/error.util.js";

/**
 * Admin integration operations: dead-letter inspection and replay, outbox
 * management, queue health and provider status. Replay paths are idempotent
 * by construction (delivery/notification rows dedup, BullMQ job ids).
 */
@Injectable()
export class IntegrationsAdminService {
  private readonly logger = new Logger(IntegrationsAdminService.name);

  constructor(
    @InjectRepository(IntegrationFailure)
    private readonly failureRepo: Repository<IntegrationFailure>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    private readonly outbox: OutboxService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
    @Optional() @InjectQueue("notifications") private readonly notificationsQueue?: Queue,
    @Optional() @InjectQueue("webhooks") private readonly webhooksQueue?: Queue,
  ) {}

  async listFailures(options: {
    queue?: string;
    status?: IntegrationFailureStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const query = this.failureRepo.createQueryBuilder("f");
    if (options.queue) query.andWhere("f.queue = :queue", { queue: options.queue });
    if (options.status) query.andWhere("f.status = :status", { status: options.status });
    const total = await query.getCount();
    const items = await query
      .orderBy("f.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
    return {
      items: items.map((f) => ({
        id: f.id,
        jobId: f.jobId,
        eventId: f.eventId,
        queue: f.queue,
        kind: f.kind,
        referenceId: f.referenceId,
        merchantId: f.merchantId,
        reason: f.reason,
        attempts: f.attempts,
        status: f.status,
        lastAttemptAt: f.lastAttemptAt?.toISOString() ?? null,
        createdAt: f.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Replays a dead-letter entry: requeues the referenced delivery (webhook)
   * or notification (SMS/email) for a fresh attempt and marks the DLQ row
   * REPLAYED. Domain effects are never duplicated because transports check
   * row state first.
   */
  async replayFailure(id: string, adminId: string) {
    const failure = await this.failureRepo.findOne({ where: { id } });
    if (!failure) {
      throw new NotFoundException({
        message: "Integration failure not found",
        error: "INTEGRATION_FAILURE_NOT_FOUND",
      });
    }
    if (failure.status !== IntegrationFailureStatus.OPEN) {
      throw new BadRequestException({
        message: `Failure is already ${failure.status}`,
        error: "INTEGRATION_FAILURE_NOT_FOUND",
      });
    }

    if (failure.kind === IntegrationFailureKind.WEBHOOK && failure.referenceId) {
      const delivery = await this.deliveryRepo.findOne({
        where: { id: failure.referenceId },
      });
      if (!delivery) {
        throw new NotFoundException({
          message: "Referenced webhook delivery no longer exists",
          error: "WEBHOOK_NOT_FOUND",
        });
      }
      delivery.status = WebhookDeliveryStatus.PENDING;
      delivery.nextRetryAt = new Date();
      await this.deliveryRepo.save(delivery);
      if (this.webhooksQueue) {
        await enqueueOrInline(
          this.webhooksQueue,
          "webhook-delivery",
          { deliveryId: delivery.id },
          { jobId: `webhook-${delivery.id}-replay-${Date.now()}`, attempts: 3, backoff: { type: "exponential", delay: 15000 } },
          () => this.webhooks.attemptDelivery(delivery.id).then(() => undefined),
        );
      } else {
        await this.webhooks.attemptDelivery(delivery.id).catch((error: unknown) =>
          this.logger.warn(`Inline replay failed: ${getErrorMessage(error, "unknown")}`),
        );
      }
    } else if (
      (failure.kind === IntegrationFailureKind.SMS ||
        failure.kind === IntegrationFailureKind.EMAIL) &&
      failure.referenceId
    ) {
      const notification = await this.notifications.findById(failure.referenceId);
      if (!notification) {
        throw new NotFoundException({
          message: "Referenced notification no longer exists",
          error: "NOTIFICATION_NOT_FOUND",
        });
      }
      if (this.notificationsQueue) {
        await enqueueOrInline(
          this.notificationsQueue,
          "notification-send",
          { notificationId: notification.id },
          { jobId: `notif-${notification.id}-replay-${Date.now()}`, attempts: 4, backoff: { type: "exponential", delay: 10000 } },
          () => this.notifications.transportNotification(notification.id),
        );
      } else {
        await this.notifications.transportNotification(notification.id).catch((error: unknown) =>
          this.logger.warn(`Inline replay failed: ${getErrorMessage(error, "unknown")}`),
        );
      }
    } else {
      throw new BadRequestException({
        message: "This failure kind cannot be replayed",
        error: "INTEGRATION_FAILURE_NOT_FOUND",
      });
    }

    failure.status = IntegrationFailureStatus.REPLAYED;
    failure.resolvedBy = adminId;
    failure.resolvedAt = new Date();
    await this.failureRepo.save(failure);
    this.logger.log(`DLQ_REPLAY failure=${failure.id} kind=${failure.kind} by=${adminId}`);
    return { id: failure.id, status: failure.status };
  }

  async resolveFailure(id: string, adminId: string) {
    const failure = await this.failureRepo.findOne({ where: { id } });
    if (!failure) {
      throw new NotFoundException({
        message: "Integration failure not found",
        error: "INTEGRATION_FAILURE_NOT_FOUND",
      });
    }
    failure.status = IntegrationFailureStatus.RESOLVED;
    failure.resolvedBy = adminId;
    failure.resolvedAt = new Date();
    await this.failureRepo.save(failure);
    return { id: failure.id, status: failure.status };
  }

  async outboxOverview() {
    return this.outbox.stats();
  }

  async outboxFailed(limit = 50) {
    const rows = await this.outbox.failedRows(limit);
    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      status: row.status,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async replayOutbox(id: string) {
    const row = await this.outbox.replay(id);
    if (!row) {
      throw new NotFoundException({
        message: "Failed outbox event not found",
        error: "EVENT_INVALID",
      });
    }
    return { id: row.id, status: row.status };
  }

  async queuesOverview() {
    const [notifications, webhooks] = await Promise.all([
      this.notificationsQueue
        ? queueCounts(this.notificationsQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
      this.webhooksQueue
        ? queueCounts(this.webhooksQueue)
        : Promise.resolve({ reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    ]);
    return [
      { name: "notifications", ...notifications },
      { name: "webhooks", ...webhooks },
    ];
  }

  async providersOverview() {
    const smsEndpoint = process.env.SMS_PROVIDER_URL?.trim();
    const emailEndpoint = process.env.EMAIL_PROVIDER_URL?.trim();
    return {
      sms: {
        mode: smsEndpoint ? ("http" as const) : ("log" as const),
        configured: Boolean(smsEndpoint && process.env.SMS_PROVIDER_KEY?.trim()),
      },
      email: {
        mode: emailEndpoint ? ("http" as const) : ("log" as const),
        configured: Boolean(emailEndpoint && process.env.EMAIL_PROVIDER_KEY?.trim()),
      },
    };
  }

  async integrationOverview() {
    const [queues, providers, stats] = await Promise.all([
      this.queuesOverview(),
      this.providersOverview(),
      this.outbox.stats(),
    ]);
    const deadLetterCount = await this.failureRepo.count({
      where: { status: IntegrationFailureStatus.OPEN },
    });
    const dayAgo = new Date(Date.now() - 24 * 3600_1000);
    const [webhookFailed24h, notificationFailed24h] = await Promise.all([
      this.failureRepo
        .createQueryBuilder("f")
        .where("f.kind = :kind", { kind: IntegrationFailureKind.WEBHOOK })
        .andWhere("f.createdAt >= :since", { since: dayAgo })
        .getCount(),
      this.failureRepo
        .createQueryBuilder("f")
        .where("f.kind IN (:...kinds)", { kinds: [IntegrationFailureKind.SMS, IntegrationFailureKind.EMAIL] })
        .andWhere("f.createdAt >= :since", { since: dayAgo })
        .getCount(),
    ]);
    const webhookTotal24h = await this.deliveryRepo
      .createQueryBuilder("d")
      .where("d.createdAt >= :since", { since: dayAgo })
      .getCount();
    return {
      queues,
      providers,
      deadLetterCount,
      webhookFailureRate24h: webhookTotal24h === 0 ? 0 : webhookFailed24h / webhookTotal24h,
      notificationFailureRate24h: notificationFailed24h,
      outbox: stats,
      checkedAt: new Date().toISOString(),
    };
  }
}
