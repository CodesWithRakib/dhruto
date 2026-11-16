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
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";
import { S3ObjectStorage } from "./s3-object-storage.js";

const logger = new Logger("ChatAttachmentsModule");

/**
 * Phase 6 attachments: upload lifecycle, authorized downloads and storage
 * cleanup on top of the existing chat module, Redis/BullMQ and the single
 * object-storage port. Without `CHAT_STORAGE_BUCKET` the endpoints return
 * 503 (fail closed) and cleanup is a no-op.
 */
@Module({
  imports: [
    ChatModule,
    BullModule.registerQueue({
      name: CHAT_ATTACHMENT_CLEANUP_QUEUE,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
    }),
  ],
  controllers: [ChatAttachmentsController],
  providers: [
    {
      provide: CHAT_OBJECT_STORAGE,
      useFactory: () => {
        const config = loadChatStorageConfig();
        if (!config)
          logger.warn("CHAT_STORAGE_BUCKET not set: chat attachments are disabled (503)");
        return new ChatStorageHolder(config ? new S3ObjectStorage(config) : null);
      },
    },
    ChatAttachmentMetrics,
    ChatAttachmentService,
    ChatAttachmentCleanupService,
    ChatAttachmentCleanupScheduler,
    ChatAttachmentCleanupProcessor,
  ],
  exports: [ChatAttachmentService, ChatAttachmentCleanupService, ChatAttachmentMetrics],
})
export class ChatAttachmentsModule {}
