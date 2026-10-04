import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  WebhookSubscription,
  WebhookDelivery,
  Merchant,
} from "../database/entities/index.js";
import { WebhooksService } from "./webhooks.service.js";
import { WebhooksController } from "./webhooks.controller.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery, Merchant]),
    MerchantsModule,
    AuthModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
