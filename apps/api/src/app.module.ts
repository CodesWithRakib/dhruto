import { Module, type NestModule, type MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { DhrutoValidationPipe } from "./common/pipes/validation.pipe.js";
import { EventsModule } from "./events/events.module.js";

import { appConfig, databaseConfig, redisConfig, authConfig } from "./config/index.js";
import { DatabaseModule } from "./database/database.module.js";
import { QueuesModule } from "./queues/queues.module.js";
import { HealthModule } from "./health/health.module.js";
import { ParcelsModule } from "./parcels/parcels.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { RidersModule } from "./riders/riders.module.js";
import { HubsModule } from "./hubs/hubs.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { MerchantsModule } from "./merchants/merchants.module.js";
import { FinanceModule } from "./finance/finance.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";
import { IntegrationsModule } from "./integrations/integrations.module.js";
import { IntelligenceModule } from "./intelligence/intelligence.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";
import { IdempotencyModule } from "./common/idempotency/idempotency.module.js";
import { SeederModule } from "./database/seed/seeder.module.js";

import { CacheModule } from "./common/cache/cache.module.js";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor.js";
import { TelemetryInterceptor } from "./common/interceptors/telemetry.interceptor.js";
import { ResponseTransformInterceptor } from "./common/interceptors/response-transform.interceptor.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, authConfig],
      envFilePath: [".env.local", ".env"],
    }),
    DatabaseModule,
    QueuesModule,
    CacheModule,
    HealthModule,
    AuthModule,
    IdempotencyModule,
    PricingModule,
    MerchantsModule,
    ParcelsModule,
    RidersModule,
    HubsModule,
    FinanceModule,
    NotificationsModule,
    WebhooksModule,
    IntegrationsModule,
    IntelligenceModule,
    AnalyticsModule,
    SeederModule,
    EventsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: DhrutoValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetryInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
