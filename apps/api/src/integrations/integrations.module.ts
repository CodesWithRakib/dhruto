import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EventOutbox,
  Notification,
  NotificationPreference,
  Merchant,
  Rider,
  HubUserAssignment,
  WebhookSubscription,
  WebhookDelivery,
  IntegrationFailure,
} from "../database/entities/index.js";
import { QueuesModule } from "../queues/queues.module.js";
import { OutboxService } from "./outbox.service.js";
import { OutboxRelayService } from "./outbox-relay.service.js";
import { IntegrationsAdminService } from "./integrations-admin.service.js";
import { IntegrationsAdminController } from "./integrations-admin.controller.js";

/**
 * Phase 5 integration boundary module.
 *
 * Owns the transactional outbox, the relay poller and the admin DLQ/queue
 * surface. Transport workers live next to their domains (notifications and
 * webhooks modules); this module only moves events, never business state.
 * WebhooksService and NotificationsService are global, so no module import
 * cycles arise here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventOutbox,
      Notification,
      NotificationPreference,
      Merchant,
      Rider,
      HubUserAssignment,
      WebhookSubscription,
      WebhookDelivery,
      IntegrationFailure,
    ]),
    QueuesModule,
  ],
  controllers: [IntegrationsAdminController],
  providers: [OutboxService, OutboxRelayService, IntegrationsAdminService],
  exports: [OutboxService, IntegrationsAdminService],
})
export class IntegrationsModule {}
