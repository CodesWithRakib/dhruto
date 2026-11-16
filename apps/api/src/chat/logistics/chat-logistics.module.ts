import { Global, Module } from "@nestjs/common";
import { CHAT_LOGISTICS_HANDLER } from "../../integrations/chat-logistics.port.js";
import { ChatModule } from "../chat.module.js";
import { ChatLogisticsService } from "./chat-logistics.service.js";

/**
 * Phase 5 logistics integration. Global so the outbox relay in
 * IntegrationsModule can inject the CHAT_LOGISTICS_HANDLER port without a
 * circular module import (ChatModule already imports IntegrationsModule) —
 * the same pattern as the Phase 3 realtime port.
 */
@Global()
@Module({
  imports: [ChatModule],
  providers: [
    ChatLogisticsService,
    { provide: CHAT_LOGISTICS_HANDLER, useExisting: ChatLogisticsService },
  ],
  exports: [CHAT_LOGISTICS_HANDLER],
})
export class ChatLogisticsModule {}
