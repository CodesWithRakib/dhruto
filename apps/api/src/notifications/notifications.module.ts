import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { Notification, Merchant, User } from "../database/entities/index.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsProcessor } from "./notifications.processor.js";
import { SmsService } from "./services/sms.service.js";
import { EmailService } from "./services/email.service.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Merchant, User]),
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
  ],
  exports: [NotificationsService, SmsService, EmailService],
})
export class NotificationsModule {}
