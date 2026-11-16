import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ChatConversationStatus, ChatConversationType } from "@dhruto/contracts";
import { ChatConversation } from "../../database/entities/index.js";
import {
  type ChatLogisticsHandler,
  type ChatLogisticsOutboxEvent,
} from "../../integrations/chat-logistics.port.js";
import { ChatAuthorizationService } from "../services/chat-authorization.service.js";
import { ChatMessageService } from "../services/chat-message.service.js";
import { ChatParcelMembershipService } from "../services/chat-parcel-membership.service.js";
import { logisticsSystemMessage } from "./chat-logistics.mapping.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parcel lifecycle → communication sync (Phase 5), driven by the existing
 * transactional outbox relay AFTER the parcel transaction committed.
 *
 * For the parcel's PARCEL_DELIVERY thread, if one exists (threads are never
 * auto-created by lifecycle events):
 *  1. reconcile membership with live eligibility (previous rider REMOVED and
 *     revoked in realtime, current rider admitted) — see
 *     ChatParcelMembershipService;
 *  2. post the mapped SYSTEM_EVENT message, idempotent per source eventId
 *     (skipped for ARCHIVED threads; reconciliation always runs).
 *
 * Both happen in one transaction holding the thread's row lock, so a retry of
 * the same event (or a concurrent get-or-create) cannot interleave.
 */
@Injectable()
export class ChatLogisticsService implements ChatLogisticsHandler {
  private readonly logger = new Logger(ChatLogisticsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly membership: ChatParcelMembershipService,
    private readonly messages: ChatMessageService,
  ) {}

  async handle(event: ChatLogisticsOutboxEvent): Promise<void> {
    const fromPayload = event.payload.parcelId;
    const parcelId = typeof fromPayload === "string" ? fromPayload : event.aggregateId;
    if (!UUID.test(parcelId)) {
      this.logger.warn(`Skipping ${event.eventType} ${event.eventId}: no parcel id`);
      return;
    }
    const systemMessage = logisticsSystemMessage(event.eventType, event.payload);

    await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(ChatConversation).findOne({
        where: { parcelId, type: ChatConversationType.PARCEL_DELIVERY },
        lock: { mode: "pessimistic_write" },
      });
      if (!conversation) return;
      const parcel = await this.authz.loadParcelScope(parcelId, manager);
      if (!parcel) return;

      const sync = await this.membership.reconcile(manager, conversation, parcel, {
        workflow: "parcel_event",
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        requestId: event.requestId,
      });
      if (systemMessage && conversation.status !== ChatConversationStatus.ARCHIVED) {
        await this.messages.appendWorkflowSystemMessage(manager, conversation.id, systemMessage, {
          sourceEventId: event.eventId,
          requestId: event.requestId,
        });
      }
      if (sync.removedUserIds.length > 0 || sync.addedUserIds.length > 0) {
        this.logger.log(
          `chat.logistics_sync conversation=${conversation.id} event=${event.eventType} removed=${sync.removedUserIds.length} added=${sync.addedUserIds.length}`,
        );
      }
    });
  }
}
