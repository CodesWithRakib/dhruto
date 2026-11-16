import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { type Queue } from "bullmq";
import { loadChatAttachmentTunables } from "./attachment.config.js";
import { ChatAttachmentCleanupService } from "./chat-attachment-cleanup.service.js";

export const CHAT_ATTACHMENT_CLEANUP_QUEUE = "chat-attachment-cleanup";
const SCHEDULER_ID = "chat-attachment-cleanup";
const REGISTER_RETRIES = 6;
const REGISTER_RETRY_MS = 5000;

/**
 * Registers ONE repeatable cleanup job in the existing BullMQ/Redis
 * infrastructure (a job scheduler is cluster-wide, so N API instances do not
 * run N cleanups per interval). Registration is retried while Redis connects;
 * if Redis stays unavailable, cleanup simply waits (nothing breaks — expired
 * uploads are unusable anyway). `CHAT_ATTACHMENT_CLEANUP_ENABLED=false`
 * disables scheduling (tests drive `runOnce` directly).
 */
@Injectable()
export class ChatAttachmentCleanupScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ChatAttachmentCleanupScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectQueue(CHAT_ATTACHMENT_CLEANUP_QUEUE) private readonly queue: Queue) {}

  onApplicationBootstrap(): void {
    if (process.env.CHAT_ATTACHMENT_CLEANUP_ENABLED === "false") return;
    void this.register(1);
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async register(attempt: number): Promise<void> {
    const every = loadChatAttachmentTunables().cleanupIntervalMs;
    try {
      await this.queue.upsertJobScheduler(
        SCHEDULER_ID,
        { every },
        { name: "cleanup", opts: { removeOnComplete: 100, removeOnFail: 500 } },
      );
      this.logger.log(`chat.attachment.cleanup_scheduled every_ms=${every}`);
    } catch {
      if (attempt >= REGISTER_RETRIES) {
        this.logger.warn(
          "chat.attachment.cleanup_schedule_failed (Redis unavailable); cleanup paused",
        );
        return;
      }
      this.timer = setTimeout(() => void this.register(attempt + 1), REGISTER_RETRY_MS);
      this.timer.unref?.();
    }
  }
}

@Processor(CHAT_ATTACHMENT_CLEANUP_QUEUE, { concurrency: 1 })
export class ChatAttachmentCleanupProcessor extends WorkerHost {
  constructor(private readonly cleanup: ChatAttachmentCleanupService) {
    super();
  }

  async process(): Promise<void> {
    await this.cleanup.runOnce();
  }
}
