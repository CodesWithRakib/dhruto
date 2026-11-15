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
 * Communication platform module.
 *
 * Phase 1 registers the persistence foundation only. Services, controllers,
 * and gateways are added in later phases; no chat behaviour is exposed yet.
 */
@Module({
  imports: [TypeOrmModule.forFeature([...CHAT_ENTITIES])],
  exports: [TypeOrmModule],
})
export class ChatModule {}
