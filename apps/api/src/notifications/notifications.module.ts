import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import {
  Notification,
  Merchant,
  User,
  NotificationPreference,
  IntegrationFailure,
} from "../database/entities/index.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsProcessor } from "./notifications.processor.js";
import { SmsService } from "./services/sms.service.js";
import { EmailService } from "./services/email.service.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { createEmailProvider, createSmsProvider } from "../integrations/providers.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Merchant,
      User,
      NotificationPreference,
      IntegrationFailure,
    ]),
    BullModule.registerQueue({
      name: "notifications",
    }),
    MerchantsModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    SmsService,
    EmailService,
    // Provider abstraction: HTTP transports when configured via env,
    // explicit log transports otherwise. Business code depends on the
    // interfaces, never on a concrete gateway.
    { provide: "SMS_PROVIDER", useFactory: () => createSmsProvider() },
    { provide: "EMAIL_PROVIDER", useFactory: () => createEmailProvider() },
  ],
  exports: [NotificationsService, SmsService, EmailService],
})
export class NotificationsModule {}
