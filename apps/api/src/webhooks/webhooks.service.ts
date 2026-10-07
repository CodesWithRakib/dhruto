import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository, EntityManager, QueryFailedError } from "typeorm";
import { randomBytes, createHmac } from "crypto";
import { getErrorMessage } from "../common/utils/error.util.js";
import {
  IntegrationFailure,
  IntegrationFailureKind,
  IntegrationFailureStatus,
  WebhookSubscription,
  WebhookDelivery,
  WebhookDeliveryStatus,
} from "../database/entities/index.js";
import {
  WEBHOOK_PAYLOAD_VERSION,
  type CreateWebhookSubscriptionDto,
  type UpdateWebhookSubscriptionDto,
  type WebhookSubscriptionItem,
  type WebhookDeliveryItem,
  WebhookEvent,
} from "@dhruto/contracts";
import { assertSafeWebhookUrl, maskSecret } from "../integrations/url-safety.util.js";
import { enqueueOrInline } from "../integrations/queue-helper.js";
import { ApiErrorCode } from "@dhruto/contracts";

export interface EventDeliveryInput {
  subscriptionId: string;
  merchantId: string;
  event: WebhookEvent | string;
  /** Outbox event id for cross-system dedup (null for ad-hoc ping/test). */
  eventId?: string | null;
  data: Record<string, unknown>;
}

function toSubscriptionItem(s: WebhookSubscription, secret: string): WebhookSubscriptionItem {
  return {
    id: s.id,
    merchantId: s.merchantId,
    url: s.url,
    events: s.events,
    secret,
    secretPreview: maskSecret(secret),
    status: s.status as "ACTIVE" | "INACTIVE",
    description: s.description || undefined,
    failureCount: s.failureCount,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function toDeliveryItem(d: WebhookDelivery): WebhookDeliveryItem {
  return {
    id: d.id,
    subscriptionId: d.subscriptionId,
    merchantId: d.merchantId,
    event: d.event,
    payload: d.payload,
    signature: d.signature,
    statusCode: d.statusCode,
    responseBody: d.responseBody,
    status: d.status,
    attemptCount: d.attemptCount,
    nextRetryAt: d.nextRetryAt?.toISOString() || null,
    lastAttemptAt: d.lastAttemptAt?.toISOString() || null,
    deliveredAt: d.deliveredAt?.toISOString() || null,
    createdAt: d.createdAt.toISOString(),
  };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectRepository(IntegrationFailure)
    private readonly failureRepo: Repository<IntegrationFailure>,
    @Optional() @InjectQueue("webhooks") private readonly webhooksQueue?: Queue,
  ) {}

  /**
   * Generates cryptographic HMAC secret for webhook signing.
   */
  private generateSecret(): string {
    return `dhr_whsec_${randomBytes(24).toString("hex")}`;
  }

  /**
   * Computes HMAC-SHA256 signature for payload verification.
   */
  generateSignature(payload: unknown, secret: string, timestamp: number): string {
    const serialized = JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${serialized}`;
    const hash = createHmac("sha256", secret).update(signaturePayload).digest("hex");
    return `t=${timestamp},v1=${hash}`;
  }

  /**
   * Registers a new webhook subscription for a merchant. The endpoint URL is
   * SSRF-validated; the full secret is returned exactly once, in this
   * response — list/detail responses only ever carry the masked preview.
   */
  async createSubscription(
    merchantId: string,
    dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionItem> {
    await this.assertUrlAllowed(dto.url);
    this.assertKnownEvents(dto.events);
    const secret = dto.secret?.trim() || this.generateSecret();
    if (secret.length < 16) {
      throw new BadRequestException({
        message: "Secret key must be at least 16 characters",
        error: ApiErrorCode.WEBHOOK_SECRET_WEAK,
      });
    }

    const subscription = await this.subscriptionRepo.save(
      this.subscriptionRepo.create({
        merchantId,
        url: dto.url.trim(),
        events: [...new Set(dto.events)],
        secret,
        description: dto.description?.trim() || null,
        status: "ACTIVE",
        failureCount: 0,
      }),
    );
    this.logger.log(
      `Created webhook subscription for merchant ${merchantId} -> ${subscription.url} ([${subscription.events.join(", ")}])`,
    );

    return toSubscriptionItem(subscription, secret);
  }

  /**
   * Lists webhook subscriptions for merchant with masked secrets.
   */
  async listSubscriptions(merchantId: string): Promise<WebhookSubscriptionItem[]> {
    const subs = await this.subscriptionRepo.find({
      where: { merchantId },
      order: { createdAt: "DESC" },
    });

    return subs.map((s) => toSubscriptionItem(s, maskSecret(s.secret)));
  }

  /**
   * Updates URL, events, status or description. URL changes re-run SSRF
   * validation; secrets never change here (see rotateSecret).
   */
  async updateSubscription(
    subscriptionId: string,
    merchantId: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionItem> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });
    if (!sub) {
      throw new NotFoundException({
        message: "Webhook subscription not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }
    if (dto.url !== undefined) {
      await this.assertUrlAllowed(dto.url);
      sub.url = dto.url.trim();
    }
    if (dto.events !== undefined) {
      if (dto.events.length === 0) {
        throw new BadRequestException({
          message: "Select at least one webhook event",
          error: ApiErrorCode.EVENT_INVALID,
        });
      }
      this.assertKnownEvents(dto.events);
      sub.events = [...new Set(dto.events)];
    }
    if (dto.status !== undefined) sub.status = dto.status;
    if (dto.description !== undefined) sub.description = dto.description?.trim() || null;
    await this.subscriptionRepo.save(sub);
    return toSubscriptionItem(sub, maskSecret(sub.secret));
  }

  /**
   * Rotates the signing secret. The new full secret is returned exactly once
   * in this response and never logged; in-flight deliveries keep working
   * because each delivery row carries the signature computed at send time.
   */
  async rotateSecret(
    subscriptionId: string,
    merchantId: string,
  ): Promise<{ id: string; secret: string; secretPreview: string; message: string }> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });
    if (!sub) {
      throw new NotFoundException({
        message: "Webhook subscription not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }
    const secret = this.generateSecret();
    sub.secret = secret;
    sub.failureCount = 0;
    await this.subscriptionRepo.save(sub);
    this.logger.log(`Rotated webhook secret for subscription ${sub.id}`);
    return {
      id: sub.id,
      secret,
      secretPreview: maskSecret(secret),
      message: "Secret rotated. Store it now — it will never be shown again.",
    };
  }

  /**
   * Deletes a webhook subscription.
   */
  async deleteSubscription(subscriptionId: string, merchantId: string): Promise<void> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });

    if (!sub) {
      throw new NotFoundException({
        message: "Webhook subscription not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }

    await this.subscriptionRepo.remove(sub);
  }

  /**
   * Creates a versioned delivery row for one subscription without touching
   * the network. Safe to call inside domain transactions; transport happens
   * through the queue (or inline fallback). Replays of the same outbox
   * event reuse the existing row via the subscription+event unique index.
   */
  async createDeliveryForEvent(
    manager: EntityManager,
    input: EventDeliveryInput,
  ): Promise<WebhookDelivery> {
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = input.eventId ?? null;
    const envelope = {
      eventId,
      type: input.event,
      version: WEBHOOK_PAYLOAD_VERSION,
      timestamp,
      data: input.data,
    };
    const sub = await manager.getRepository(WebhookSubscription).findOne({
      where: { id: input.subscriptionId },
    });
    if (!sub || sub.status !== "ACTIVE") {
      throw new NotFoundException({
        message: "Webhook subscription not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }
    const signature = this.generateSignature(envelope, sub.secret, timestamp);

    if (input.eventId) {
      const duplicate = await manager.getRepository(WebhookDelivery).findOne({
        where: { subscriptionId: sub.id, eventId: input.eventId },
      });
      if (duplicate) {
        this.logger.log(`WEBHOOK_DEDUP subscription=${sub.id} event=${input.eventId}`);
        return duplicate;
      }
      try {
        return await manager.getRepository(WebhookDelivery).save(
          manager.getRepository(WebhookDelivery).create({
            subscriptionId: sub.id,
            merchantId: input.merchantId,
            event: input.event,
            eventId: input.eventId,
            payload: envelope,
            signature,
            status: WebhookDeliveryStatus.PENDING,
            attemptCount: 0,
            lastAttemptAt: null,
          }),
        );
      } catch (error) {
        // Lost a concurrent insert race: the unique index won, reuse it.
        if (isUniqueViolation(error)) {
          const raced = await manager.getRepository(WebhookDelivery).findOneOrFail({
            where: { subscriptionId: sub.id, eventId: input.eventId },
          });
          this.logger.log(`WEBHOOK_DEDUP_RACE subscription=${sub.id} event=${input.eventId}`);
          return raced;
        }
        throw error;
      }
    }

    return manager.getRepository(WebhookDelivery).save(
      manager.getRepository(WebhookDelivery).create({
        subscriptionId: sub.id,
        merchantId: input.merchantId,
        event: input.event,
        eventId: null,
        payload: envelope as Record<string, unknown>,
        signature,
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 0,
        lastAttemptAt: null,
      }),
    );
  }

  /**
   * Legacy fan-out entry point: creates delivery rows for every matching
   * subscription and transports them through the queue (or inline when Redis
   * is unreachable). Prefer outbox emission from domain services; this stays
   * for explicit call sites such as tests and the ping flow.
   */
  async dispatchEvent(
    event: WebhookEvent | string,
    merchantId: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookDelivery[]> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { merchantId, status: "ACTIVE" },
    });

    const matchingSubs = subscriptions.filter(
      (s) => s.events.includes(event) || s.events.includes("*"),
    );

    if (matchingSubs.length === 0) {
      return [];
    }

    const deliveries: WebhookDelivery[] = [];

    for (const sub of matchingSubs) {
      const delivery = await this.createDeliveryForEvent(this.subscriptionRepo.manager, {
        subscriptionId: sub.id,
        merchantId,
        event,
        eventId: null,
        data: payload,
      });
      deliveries.push(delivery);
      await this.enqueueDelivery(delivery.id);
    }

    return deliveries;
  }

  /**
   * Executes a single delivery attempt. Throws on transport failure so queue
   * retries apply; the row always records the attempt outcome first.
   */
  async attemptDelivery(deliveryId: string): Promise<WebhookDeliveryStatus> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId },
      relations: ["subscription"],
    });
    if (!delivery) {
      throw new NotFoundException({
        message: "Webhook delivery not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }
    if (delivery.status === WebhookDeliveryStatus.DELIVERED) {
      return delivery.status;
    }
    const sub = delivery.subscription;
    if (!sub || sub.status !== "ACTIVE") {
      delivery.status = WebhookDeliveryStatus.FAILED;
      delivery.responseBody = "Subscription inactive or deleted";
      await this.deliveryRepo.save(delivery);
      throw new Error("Subscription inactive or deleted");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Dhruto-Webhook-Worker/1.0",
          "X-Dhruto-Event": delivery.event,
          "X-Dhruto-Delivery": delivery.id,
          "X-Dhruto-Timestamp": this.timestampFromSignature(delivery.signature),
          "X-Dhruto-Signature": delivery.signature,
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      delivery.statusCode = response.status;
      const text = await response.text();
      delivery.responseBody = text.slice(0, 1000);
      delivery.attemptCount += 1;
      delivery.lastAttemptAt = new Date();

      if (response.ok) {
        delivery.status = WebhookDeliveryStatus.DELIVERED;
        delivery.deliveredAt = new Date();
        delivery.nextRetryAt = null;
        sub.failureCount = 0;
        await this.subscriptionRepo.save(sub);
      } else if (response.status >= 400 && response.status < 500) {
        // Permanent: the merchant must fix the endpoint. Recorded directly
        // as dead-letter with a DLQ row — endless retry would never succeed.
        delivery.status = WebhookDeliveryStatus.DEAD_LETTER;
        delivery.nextRetryAt = null;
        delivery.attemptCount += 1;
        delivery.lastAttemptAt = new Date();
        sub.failureCount += 1;
        await this.subscriptionRepo.save(sub);
        await this.deliveryRepo.save(delivery);
        await this.recordDeadLetter(delivery, `HTTP ${response.status}: ${delivery.responseBody}`);
        this.logger.warn(
          `Webhook delivery ${delivery.id} refused with HTTP ${response.status}; dead-lettered`,
        );
        return delivery.status;
      } else {
        delivery.status = WebhookDeliveryStatus.FAILED;
        delivery.nextRetryAt = new Date(Date.now() + Math.pow(2, delivery.attemptCount) * 15000);
        sub.failureCount += 1;
        await this.subscriptionRepo.save(sub);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      delivery.attemptCount += 1;
      delivery.lastAttemptAt = new Date();
      delivery.responseBody = getErrorMessage(err, "Connection refused / timeout").slice(0, 1000);
      delivery.status = WebhookDeliveryStatus.FAILED;
      delivery.nextRetryAt = new Date(Date.now() + Math.pow(2, delivery.attemptCount) * 15000);
      sub.failureCount += 1;
      await this.subscriptionRepo.save(sub);
    }

    await this.deliveryRepo.save(delivery);

    if (delivery.status !== WebhookDeliveryStatus.DELIVERED) {
      throw new Error(delivery.responseBody || "Webhook delivery failed");
    }
    return delivery.status;
  }

  /**
   * Manually retries a failed or dead-letter webhook delivery: re-queues a
   * fresh attempt (attempt history stays cumulative for audit).
   */
  async retryDelivery(deliveryId: string, merchantId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId, merchantId },
      relations: ["subscription"],
    });

    if (!delivery) {
      throw new NotFoundException({
        message: "Webhook delivery not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }

    const sub = delivery.subscription;
    if (!sub) {
      throw new BadRequestException("Linked webhook subscription no longer exists");
    }

    delivery.lastAttemptAt = new Date();
    delivery.status = WebhookDeliveryStatus.PENDING;

    const timestamp = Math.floor(Date.now() / 1000);
    delivery.signature = this.generateSignature(delivery.payload, sub.secret, timestamp);

    await this.deliveryRepo.save(delivery);
    await this.enqueueDelivery(delivery.id);
    return delivery;
  }

  /**
   * Sends an immediate test ping event to verify webhook URL. Clearly marked
   * as synthetic: it creates no parcel or financial state.
   */
  async pingSubscription(subscriptionId: string, merchantId: string): Promise<WebhookDelivery> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });

    if (!sub) {
      throw new NotFoundException({
        message: "Webhook subscription not found",
        error: ApiErrorCode.WEBHOOK_NOT_FOUND,
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      eventId: null,
      type: "webhook.ping",
      version: WEBHOOK_PAYLOAD_VERSION,
      timestamp,
      data: {
        event: "webhook.ping",
        subscriptionId: sub.id,
        message: "Test webhook dispatch from Dhruto Logistics Platform.",
        synthetic: true,
      },
    };

    const signature = this.generateSignature(payload, sub.secret, timestamp);

    const delivery = await this.deliveryRepo.save(
      this.deliveryRepo.create({
        subscriptionId: sub.id,
        merchantId,
        event: "webhook.ping",
        eventId: null,
        payload: payload as Record<string, unknown>,
        signature,
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 0,
        lastAttemptAt: null,
      }),
    );
    // A ping is an explicit synchronous test action: the attempt runs inline
    // so the caller sees the honest outcome immediately. Failures still
    // record the row and remain retryable through the normal path.
    await this.attemptDelivery(delivery.id).catch((error: unknown) =>
      this.logger.warn(`Ping attempt failed: ${getErrorMessage(error, "unknown")}`),
    );
    const reloaded = await this.deliveryRepo.findOne({ where: { id: delivery.id } });
    return reloaded ?? delivery;
  }

  /**
   * Lists past deliveries for audit log and developer debugging.
   */
  async listDeliveries(
    merchantId: string,
    options: { page?: number; limit?: number; status?: WebhookDeliveryStatus } = {},
  ): Promise<{ items: WebhookDeliveryItem[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const query = this.deliveryRepo
      .createQueryBuilder("d")
      .where("d.merchant_id = :merchantId", { merchantId });

    if (options.status) {
      query.andWhere("d.status = :status", { status: options.status });
    }

    const total = await query.getCount();
    const deliveries = await query
      .orderBy("d.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();

    return {
      items: deliveries.map(toDeliveryItem),
      total,
      page,
      limit,
    };
  }

  private async enqueueDelivery(deliveryId: string): Promise<void> {
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current || current.status === WebhookDeliveryStatus.DELIVERED) {
      return;
    }
    if (this.webhooksQueue) {
      await enqueueOrInline(
        this.webhooksQueue,
        "webhook-delivery",
        { deliveryId },
        {
          jobId: `webhook-${deliveryId}-${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 15000 },
        },
        () => this.attemptDelivery(deliveryId).then(() => undefined),
      );
    } else {
      // No queue wired: single immediate attempt; the sweeper retries due rows.
      await this.attemptDelivery(deliveryId).catch((error: unknown) =>
        this.logger.warn(`Inline webhook attempt failed: ${getErrorMessage(error, "unknown")}`),
      );
    }
  }

  /**
   * Moves an exhausted delivery to dead-letter with a DLQ row. Called by the
   * queue worker after its final failed attempt.
   */
  async markDeadLetter(deliveryId: string, reason: string): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery || delivery.status === WebhookDeliveryStatus.DELIVERED) return;
    delivery.status = WebhookDeliveryStatus.DEAD_LETTER;
    delivery.nextRetryAt = null;
    delivery.responseBody = (delivery.responseBody ?? reason).slice(0, 1000);
    await this.deliveryRepo.save(delivery);
    await this.recordDeadLetter(delivery, reason);
  }

  private async recordDeadLetter(delivery: WebhookDelivery, reason: string): Promise<void> {
    try {
      await this.failureRepo.save(
        this.failureRepo.create({
          jobId: `webhook-${delivery.id}`,
          eventId: delivery.eventId,
          queue: "webhooks",
          kind: IntegrationFailureKind.WEBHOOK,
          referenceId: delivery.id,
          merchantId: delivery.merchantId,
          reason: reason.slice(0, 1000),
          attempts: delivery.attemptCount,
          status: IntegrationFailureStatus.OPEN,
          lastAttemptAt: new Date(),
        }),
      );
    } catch (error) {
      // Unique jobId: already recorded (e.g. duplicate final-failure events).
      this.logger.warn(`DLQ write skipped: ${getErrorMessage(error, "unknown")}`);
    }
  }

  private timestampFromSignature(signature: string): string {
    const match = signature.match(/^t=(\d+),/);
    return match?.[1] ?? Math.floor(Date.now() / 1000).toString();
  }

  private async assertUrlAllowed(url: string): Promise<void> {
    try {
      await assertSafeWebhookUrl(url);
    } catch (error) {
      const failure = error as { error?: string; message?: string };
      throw new HttpException(
        {
          message: failure.message ?? "Webhook URL is not allowed",
          error: failure.error ?? ApiErrorCode.WEBHOOK_INVALID_URL,
        },
        400,
      );
    }
  }

  private assertKnownEvents(events: string[]): void {
    const known = new Set([...Object.values(WebhookEvent)]);
    const unknown = events.filter((event) => !known.has(event as WebhookEvent));
    if (unknown.length > 0) {
      throw new BadRequestException({
        message: `Unknown webhook event(s): ${unknown.join(", ")}`,
        error: ApiErrorCode.EVENT_INVALID,
      });
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as { code?: string };
    return driverError?.code === "23505";
  }
  return false;
}
