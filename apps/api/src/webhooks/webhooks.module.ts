import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import {
  WebhookSubscription,
  WebhookDelivery,
  Merchant,
  IntegrationFailure,
} from "../database/entities/index.js";
import { WebhooksService } from "./webhooks.service.js";
import { WebhooksProcessor } from "./webhooks.processor.js";
import { WebhooksController } from "./webhooks.controller.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery, Merchant, IntegrationFailure]),
    BullModule.registerQueue({
      name: "webhooks",
    }),
    MerchantsModule,
    AuthModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
