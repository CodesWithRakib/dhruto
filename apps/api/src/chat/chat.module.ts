import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ChatAttachment,
  ChatAuditLog,
  ChatConversation,
  ChatInternalNote,
  ChatMessage,
  ChatMessageEdit,
  ChatMessageReaction,
  ChatParticipant,
  ChatPin,
  ChatReport,
} from "../database/entities/index.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { ChatAdminController } from "./chat-admin.controller.js";
import { ChatConversationsController } from "./chat-conversations.controller.js";
import { ChatMessagesController } from "./chat-messages.controller.js";
import { ChatAdminService } from "./services/chat-admin.service.js";
import { ChatAuditService } from "./services/chat-audit.service.js";
import { ChatAuthorizationService } from "./services/chat-authorization.service.js";
import { ChatConversationService } from "./services/chat-conversation.service.js";
import { ChatCursorService } from "./services/chat-cursor.service.js";
import { ChatEventsService } from "./services/chat-events.service.js";
import { ChatInteractionService } from "./services/chat-interaction.service.js";
import { ChatMessageReaderService } from "./services/chat-message-reader.service.js";
import { ChatMessageService } from "./services/chat-message.service.js";
import { ChatParticipantService } from "./services/chat-participant.service.js";
import { ChatSearchService } from "./services/chat-search.service.js";
import { ChatParcelMembershipService } from "./services/chat-parcel-membership.service.js";
import { ChatStaffInterventionService } from "./services/chat-staff-intervention.service.js";

/** Communication platform persistence entities (registered for autoLoadEntities). */
export const CHAT_ENTITIES = [
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  ChatAttachment,
  ChatMessageReaction,
  ChatMessageEdit,
  ChatPin,
  ChatReport,
  ChatInternalNote,
  ChatAuditLog,
] as const;

/**
 * Communication platform module (Phase 2: REST backend).
 *
 * Realtime delivery (WebSocket gateway, Redis adapter) is Phase 3 and consumes
 * the chat events this module appends to the existing transactional outbox
 * (IntegrationsModule's OutboxService).
 */
@Module({
  imports: [TypeOrmModule.forFeature([...CHAT_ENTITIES]), IntegrationsModule],
  controllers: [ChatConversationsController, ChatMessagesController, ChatAdminController],
  providers: [
    ChatAuthorizationService,
    ChatAuditService,
    ChatEventsService,
    ChatMessageReaderService,
    ChatConversationService,
    ChatParticipantService,
    ChatMessageService,
    ChatCursorService,
    ChatInteractionService,
    ChatSearchService,
    ChatAdminService,
    ChatParcelMembershipService,
    ChatStaffInterventionService,
  ],
  exports: [
    TypeOrmModule,
    ChatAuthorizationService,
    ChatCursorService,
    ChatMessageReaderService,
    // Phase 5 logistics sync (ChatLogisticsModule).
    ChatMessageService,
    ChatParcelMembershipService,
    // Phase 6 attachments (ChatAttachmentsModule).
    ChatAuditService,
  ],
})
export class ChatModule {}
