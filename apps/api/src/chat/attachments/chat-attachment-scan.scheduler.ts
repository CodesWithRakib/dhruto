import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { type Queue } from "bullmq";
import { loadChatAttachmentTunables } from "./attachment.config.js";
import { ChatAttachmentScanService } from "./chat-attachment-scan.service.js";

export const CHAT_ATTACHMENT_SCAN_QUEUE = "chat-attachment-scan";
const SCHEDULER_ID = "chat-attachment-scan";
const REGISTER_RETRIES = 6;
const REGISTER_RETRY_MS = 5000;

/**
 * One cluster-wide repeatable scan job on the existing BullMQ/Redis (same
 * pattern as the Phase 6 cleanup scheduler). If Redis is unavailable the
 * scan simply waits — files stay PENDING and undownloadable (fail closed).
 * `CHAT_MALWARE_SCAN_ENABLED=false` disables scheduling (tests drive
 * `runOnce` directly).
 */
@Injectable()
export class ChatAttachmentScanScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ChatAttachmentScanScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectQueue(CHAT_ATTACHMENT_SCAN_QUEUE) private readonly queue: Queue) {}

  onApplicationBootstrap(): void {
    if (process.env.CHAT_MALWARE_SCAN_ENABLED === "false") return;
    void this.register(1);
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async register(attempt: number): Promise<void> {
    const every = loadChatAttachmentTunables().scanIntervalMs;
    try {
      await this.queue.upsertJobScheduler(
        SCHEDULER_ID,
        { every },
        { name: "scan", opts: { removeOnComplete: 100, removeOnFail: 500 } },
      );
      this.logger.log(`chat.attachment.scan_scheduled every_ms=${every}`);
    } catch {
      if (attempt >= REGISTER_RETRIES) {
        this.logger.warn("chat.attachment.scan_schedule_failed (Redis unavailable); scan paused");
        return;
      }
      this.timer = setTimeout(() => void this.register(attempt + 1), REGISTER_RETRY_MS);
      this.timer.unref?.();
    }
  }
}

@Processor(CHAT_ATTACHMENT_SCAN_QUEUE, { concurrency: 1 })
export class ChatAttachmentScanProcessor extends WorkerHost {
  constructor(private readonly scan: ChatAttachmentScanService) {
    super();
  }

  async process(): Promise<void> {
    await this.scan.runOnce();
  }
}
