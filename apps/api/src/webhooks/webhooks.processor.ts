import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service.js";
import { getErrorMessage } from "../common/utils/error.util.js";

interface WebhookDeliveryJob {
  deliveryId: string;
}

/**
 * Background webhook transport worker.
 *
 * Each job carries only a delivery id; the row records every attempt, so
 * redelivery is naturally idempotent (DELIVERED rows are skipped). The
 * service throws on transport failure for BullMQ retry with exponential
 * backoff; exhausted jobs are dead-lettered with a DLQ row for admin replay.
 */
@Processor("webhooks")
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<WebhookDeliveryJob>): Promise<void> {
    this.logger.log(
      `WEBHOOK_JOB_START job=${job.id} delivery=${job.data.deliveryId} attempt=${job.attemptsMade + 1}`,
    );
    await this.webhooksService.attemptDelivery(job.data.deliveryId);
    this.logger.log(`WEBHOOK_JOB_DONE job=${job.id}`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<WebhookDeliveryJob> | undefined, error: Error): Promise<void> {
    if (!job) return;
    this.logger.warn(
      `WEBHOOK_JOB_FAILED job=${job.id} attempts=${job.attemptsMade} error=${getErrorMessage(error, "unknown")}`,
    );
    await this.webhooksService.markDeadLetter(
      job.data.deliveryId,
      `Worker exhausted after ${job.attemptsMade} attempts: ${getErrorMessage(error, "unknown")}`,
    );
  }
}
