import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes, createHmac } from "crypto";
import { getErrorMessage } from "../common/utils/error.util.js";
import {
  WebhookSubscription,
  WebhookDelivery,
  WebhookDeliveryStatus,
} from "../database/entities/index.js";
import {
  type CreateWebhookSubscriptionDto,
  type WebhookSubscriptionItem,
  type WebhookDeliveryItem,
  WebhookEvent,
} from "@dhruto/contracts";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
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
   * Registers a new webhook subscription for a merchant.
   */
  async createSubscription(
    merchantId: string,
    dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscription> {
    const secret = dto.secret || this.generateSecret();

    const subscription = this.subscriptionRepo.create({
      merchantId,
      url: dto.url,
      events: dto.events,
      secret,
      description: dto.description || null,
      status: "ACTIVE",
      failureCount: 0,
    });

    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Created webhook subscription for merchant ${merchantId} -> ${dto.url} ([${dto.events.join(", ")}])`);

    return subscription;
  }

  /**
   * Lists all active or configured webhook subscriptions for merchant.
   */
  async listSubscriptions(merchantId: string): Promise<WebhookSubscriptionItem[]> {
    const subs = await this.subscriptionRepo.find({
      where: { merchantId },
      order: { createdAt: "DESC" },
    });

    return subs.map((s) => ({
      id: s.id,
      merchantId: s.merchantId,
      url: s.url,
      events: s.events,
      secret: s.secret,
      status: s.status as "ACTIVE" | "INACTIVE",
      description: s.description || undefined,
      failureCount: s.failureCount,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  /**
   * Deletes a webhook subscription.
   */
  async deleteSubscription(subscriptionId: string, merchantId: string): Promise<void> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });

    if (!sub) {
      throw new NotFoundException("Webhook subscription not found");
    }

    await this.subscriptionRepo.remove(sub);
  }

  /**
   * Dispatches a webhook event to all subscribed merchant endpoints.
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
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(payload, sub.secret, timestamp);

      const delivery = this.deliveryRepo.create({
        subscriptionId: sub.id,
        merchantId,
        event,
        payload,
        signature,
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      });

      await this.deliveryRepo.save(delivery);
      deliveries.push(delivery);

      // Execute HTTP POST delivery
      await this.executeDelivery(delivery, sub, timestamp);
    }

    return deliveries;
  }

  /**
   * Executes HTTP delivery attempt with retry and dead-letter handling.
   */
  private async executeDelivery(
    delivery: WebhookDelivery,
    sub: WebhookSubscription,
    timestamp: number,
  ): Promise<void> {
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
          "X-Dhruto-Timestamp": timestamp.toString(),
          "X-Dhruto-Signature": delivery.signature,
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      delivery.statusCode = response.status;
      const text = await response.text();
      delivery.responseBody = text.slice(0, 1000);

      if (response.ok) {
        delivery.status = WebhookDeliveryStatus.DELIVERED;
        delivery.deliveredAt = new Date();
        sub.failureCount = 0;
        await this.subscriptionRepo.save(sub);
      } else {
        await this.handleDeliveryFailure(delivery, sub, `HTTP ${response.status}: ${delivery.responseBody}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      await this.handleDeliveryFailure(
        delivery,
        sub,
        getErrorMessage(err, "Connection refused / timeout"),
      );
    }

    await this.deliveryRepo.save(delivery);
  }

  /**
   * Handles delivery failure and exponential backoff retry scheduling or dead-lettering.
   */
  private async handleDeliveryFailure(
    delivery: WebhookDelivery,
    sub: WebhookSubscription,
    reason: string,
  ): Promise<void> {
    delivery.responseBody = reason;

    if (delivery.attemptCount >= 3) {
      delivery.status = WebhookDeliveryStatus.DEAD_LETTER;
      delivery.nextRetryAt = null;
      sub.failureCount += 1;
      this.logger.warn(`Webhook delivery ${delivery.id} moved to DEAD_LETTER after 3 failed attempts: ${reason}`);
    } else {
      delivery.status = WebhookDeliveryStatus.FAILED;
      // Exponential backoff: attempt 1 -> 30s, attempt 2 -> 60s
      const delaySeconds = Math.pow(2, delivery.attemptCount) * 15;
      delivery.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
      sub.failureCount += 1;
      this.logger.warn(`Webhook delivery ${delivery.id} failed (attempt ${delivery.attemptCount}): ${reason}. Scheduled retry in ${delaySeconds}s.`);
    }

    await this.subscriptionRepo.save(sub);
  }

  /**
   * Manually retries a failed or dead-letter webhook delivery.
   */
  async retryDelivery(deliveryId: string, merchantId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId, merchantId },
      relations: ["subscription"],
    });

    if (!delivery) {
      throw new NotFoundException("Webhook delivery not found");
    }

    const sub = delivery.subscription;
    if (!sub) {
      throw new BadRequestException("Linked webhook subscription no longer exists");
    }

    delivery.attemptCount += 1;
    delivery.lastAttemptAt = new Date();
    delivery.status = WebhookDeliveryStatus.PENDING;

    const timestamp = Math.floor(Date.now() / 1000);
    delivery.signature = this.generateSignature(delivery.payload, sub.secret, timestamp);

    await this.executeDelivery(delivery, sub, timestamp);
    return delivery;
  }

  /**
   * Sends an immediate test ping event to verify webhook URL.
   */
  async pingSubscription(subscriptionId: string, merchantId: string): Promise<WebhookDelivery> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, merchantId },
    });

    if (!sub) {
      throw new NotFoundException("Webhook subscription not found");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      event: "webhook.ping",
      subscriptionId: sub.id,
      timestamp,
      message: "Test webhook dispatch from Dhruto Logistics Platform.",
    };

    const signature = this.generateSignature(payload, sub.secret, timestamp);

    const delivery = this.deliveryRepo.create({
      subscriptionId: sub.id,
      merchantId,
      event: "webhook.ping",
      payload,
      signature,
      status: WebhookDeliveryStatus.PENDING,
      attemptCount: 1,
      lastAttemptAt: new Date(),
    });

    await this.deliveryRepo.save(delivery);
    await this.executeDelivery(delivery, sub, timestamp);
    return delivery;
  }

  /**
   * Lists past deliveries for audit log and developer debugging.
   */
  async listDeliveries(
    merchantId: string,
    limit = 50,
    status?: WebhookDeliveryStatus,
  ): Promise<WebhookDeliveryItem[]> {
    const query = this.deliveryRepo
      .createQueryBuilder("d")
      .where("d.merchant_id = :merchantId", { merchantId });

    if (status) {
      query.andWhere("d.status = :status", { status });
    }

    query.orderBy("d.createdAt", "DESC").take(limit);

    const deliveries = await query.getMany();

    return deliveries.map((d) => ({
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
    }));
  }
}
