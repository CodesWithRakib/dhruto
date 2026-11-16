import { Global, Module } from "@nestjs/common";
import { ChatAttachmentsModule } from "../attachments/chat-attachments.module.js";
import { ChatObservabilityService } from "./chat-observability.service.js";

/**
 * Phase 8 — communication operational signals. Global (like
 * ChatRealtimeModule) so the health controller can expose them without a
 * module import cycle; the health controller injects it optionally.
 */
@Global()
@Module({
  imports: [ChatAttachmentsModule],
  providers: [ChatObservabilityService],
  exports: [ChatObservabilityService],
})
export class ChatObservabilityModule {}
