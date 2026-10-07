import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { Repository } from "typeorm";
import { NotificationsService } from "./notifications.service.js";
import {
  IntegrationFailure,
  IntegrationFailureKind,
  IntegrationFailureStatus,
} from "../database/entities/index.js";
import { getErrorMessage } from "../common/utils/error.util.js";

interface NotificationSendJob {
  notificationId: string;
}

/**
 * Background SMS/email transport worker.
 *
 * Each job carries only a notification id; the row is the source of truth,
 * so redelivery is naturally idempotent (SENT rows are skipped). Transient
 * provider failures throw for BullMQ retry with exponential backoff;
 * permanent failures complete the job as FAILED without retry. Exhausted
 * jobs land in the dead-letter table for admin replay.
 */
@Processor("notifications", { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(IntegrationFailure)
    private readonly failureRepo: Repository<IntegrationFailure>,
  ) {
    super();
  }

  async process(job: Job<NotificationSendJob>): Promise<void> {
    this.logger.log(
      `NOTIFICATION_JOB_START job=${job.id} notification=${job.data.notificationId} attempt=${job.attemptsMade + 1}`,
    );
    await this.notificationsService.transportNotification(job.data.notificationId);
    this.logger.log(`NOTIFICATION_JOB_DONE job=${job.id}`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<NotificationSendJob> | undefined, error: Error): Promise<void> {
    if (!job) return;
    this.logger.warn(
      `NOTIFICATION_JOB_FAILED job=${job.id} attempts=${job.attemptsMade} error=${getErrorMessage(error, "unknown")}`,
    );
    try {
      const row = await this.notificationsService.findById(job.data.notificationId);
      await this.failureRepo.save(
        this.failureRepo.create({
          jobId: String(job.id ?? `notif-${job.data.notificationId}-${Date.now()}`),
          eventId: row?.eventId ?? null,
          queue: "notifications",
          kind:
            row?.channel === "SMS"
              ? IntegrationFailureKind.SMS
              : IntegrationFailureKind.EMAIL,
          referenceId: job.data.notificationId,
          merchantId: row?.merchantId ?? null,
          reason: getErrorMessage(error, "notification transport failed").slice(0, 1000),
          attempts: job.attemptsMade,
          status: IntegrationFailureStatus.OPEN,
          lastAttemptAt: new Date(),
        }),
      );
    } catch (writeError) {
      // Unique jobId means a replay already recorded this failure; never
      // let DLQ bookkeeping crash the worker.
      this.logger.warn(
        `DLQ write skipped: ${getErrorMessage(writeError, "unknown")}`,
      );
    }
  }
}
