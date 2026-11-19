import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { type Queue } from "bullmq";
import { NOTIFICATION_SWEEP_JOB } from "./notifications.processor.js";

const SCHEDULER_ID = "notifications-stale-pending-sweep";
const SWEEP_EVERY_MS = 5 * 60 * 1000;
const REGISTER_RETRIES = 6;
const REGISTER_RETRY_MS = 5000;

/**
 * Registers one cluster-wide repeatable job on the existing `notifications`
 * queue that re-dispatches SMS/email stuck in PENDING (see
 * NotificationsService.redispatchStalePending). Retries registration while
 * Redis connects; `NOTIFICATION_SWEEP_ENABLED=false` disables it (tests).
 */
@Injectable()
export class NotificationsSweepScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsSweepScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectQueue("notifications") private readonly queue: Queue) {}

  onApplicationBootstrap(): void {
    if (process.env.NOTIFICATION_SWEEP_ENABLED === "false") return;
    void this.register(1);
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async register(attempt: number): Promise<void> {
    try {
      await this.queue.upsertJobScheduler(
        SCHEDULER_ID,
        { every: SWEEP_EVERY_MS },
        { name: NOTIFICATION_SWEEP_JOB, opts: { removeOnComplete: 50, removeOnFail: 100 } },
      );
      this.logger.log(`notifications.sweep_scheduled every_ms=${SWEEP_EVERY_MS}`);
    } catch {
      if (attempt >= REGISTER_RETRIES) {
        this.logger.warn("notifications.sweep_schedule_failed (Redis unavailable)");
        return;
      }
      this.timer = setTimeout(() => void this.register(attempt + 1), REGISTER_RETRY_MS);
      this.timer.unref?.();
    }
  }
}
