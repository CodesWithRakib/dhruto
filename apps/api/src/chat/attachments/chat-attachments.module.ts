import { Logger, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ChatModule } from "../chat.module.js";
import { loadChatStorageConfig } from "./attachment.config.js";
import { ChatAttachmentMetrics } from "./chat-attachment-metrics.js";
import { ChatAttachmentService, ChatStorageHolder } from "./chat-attachment.service.js";
import { ChatAttachmentCleanupService } from "./chat-attachment-cleanup.service.js";
import {
  CHAT_ATTACHMENT_CLEANUP_QUEUE,
  ChatAttachmentCleanupProcessor,
  ChatAttachmentCleanupScheduler,
} from "./chat-attachment-cleanup.scheduler.js";
import { ChatAttachmentsController } from "./chat-attachments.controller.js";
import { ChatAdminAttachmentsController } from "./chat-admin-attachments.controller.js";
import { ChatAttachmentAdminService } from "./chat-attachment-admin.service.js";
import { ChatAttachmentScanService } from "./chat-attachment-scan.service.js";
import {
  CHAT_ATTACHMENT_SCAN_QUEUE,
  ChatAttachmentScanProcessor,
  ChatAttachmentScanScheduler,
} from "./chat-attachment-scan.scheduler.js";
import { ClamAvScanner, loadClamAvConfig } from "./clamav-scanner.js";
import { DevPassThroughMalwareScanner } from "./dev-passthrough-scanner.js";
import { LocalObjectStorage } from "./local-object-storage.js";
import { CHAT_MALWARE_SCANNER, ChatMalwareScannerHolder } from "./malware-scanner.port.js";
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";
import { S3ObjectStorage } from "./s3-object-storage.js";

const logger = new Logger("ChatAttachmentsModule");

/**
 * Phase 6 attachments: upload lifecycle, authorized downloads and storage
 * cleanup on top of the existing chat module, Redis/BullMQ and the single
 * object-storage port. Phase 7 adds the malware-scan gate (ClamAV adapter,
 * fail closed when unconfigured), staff attachment review and retention.
 */
@Module({
  imports: [
    ChatModule,
    BullModule.registerQueue({
      name: CHAT_ATTACHMENT_CLEANUP_QUEUE,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
    }),
    // Phase 7: per-file retries live in the scan service (DB backoff), so the
    // repeatable job itself is not retried.
    BullModule.registerQueue({ name: CHAT_ATTACHMENT_SCAN_QUEUE }),
  ],
  controllers: [ChatAttachmentsController, ChatAdminAttachmentsController],
  providers: [
    {
      provide: CHAT_OBJECT_STORAGE,
      useFactory: () => {
        const config = loadChatStorageConfig();
        if (config) {
          logger.log(`Chat attachments using S3ObjectStorage (bucket: ${config.bucket})`);
          return new ChatStorageHolder(new S3ObjectStorage(config));
        }
        if (process.env.CHAT_STORAGE_DISABLED === "true") {
          logger.warn("CHAT_STORAGE_DISABLED=true: chat attachments disabled");
          return new ChatStorageHolder(null);
        }
        logger.log("Chat attachments using LocalObjectStorage fallback for development");
        return new ChatStorageHolder(new LocalObjectStorage());
      },
    },
    ChatAttachmentMetrics,
    ChatAttachmentService,
    ChatAttachmentCleanupService,
    ChatAttachmentCleanupScheduler,
    ChatAttachmentCleanupProcessor,
    {
      provide: CHAT_MALWARE_SCANNER,
      useFactory: () => {
        const config = loadClamAvConfig();
        if (config) {
          return new ChatMalwareScannerHolder(new ClamAvScanner(config));
        }
        if (process.env.NODE_ENV === "production" && process.env.CHAT_ALLOW_DEV_SCANNER !== "true") {
          logger.warn(
            "CHAT_CLAMAV_HOST not set in production: no malware scanner; attachments stay pending",
          );
          return new ChatMalwareScannerHolder(null);
        }
        logger.log("Chat malware scanner using DevPassThroughMalwareScanner for development");
        return new ChatMalwareScannerHolder(new DevPassThroughMalwareScanner());
      },
    },
    ChatAttachmentScanService,
    ChatAttachmentScanScheduler,
    ChatAttachmentScanProcessor,
    ChatAttachmentAdminService,
  ],
  exports: [
    ChatAttachmentService,
    ChatAttachmentCleanupService,
    ChatAttachmentMetrics,
    ChatAttachmentScanService,
  ],
})
export class ChatAttachmentsModule {}
