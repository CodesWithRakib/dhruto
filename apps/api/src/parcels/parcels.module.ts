import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ParcelsController } from "./parcels.controller.js";
import { TrackingController } from "./tracking.controller.js";
import { ParcelsService } from "./parcels.service.js";
import { ParcelLifecycleService } from "./lifecycle/parcel-lifecycle.service.js";
import { TrackingCodeService } from "./services/tracking-code.service.js";
import {
  Parcel,
  ParcelStatusHistory,
  Merchant,
  ParcelAssignment,
  Rider,
  Hub,
} from "../database/entities/index.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { IdempotencyModule } from "../common/idempotency/idempotency.module.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parcel,
      ParcelStatusHistory,
      Merchant,
      ParcelAssignment,
      Rider,
      Hub,
    ]),
    PricingModule,
    IdempotencyModule,
    // OutboxService for transactional domain-event emission.
    IntegrationsModule,
  ],
  controllers: [ParcelsController, TrackingController],
  providers: [
    ParcelsService,
    ParcelLifecycleService,
    TrackingCodeService,
    RateLimitGuard,
  ],
  // ParcelLifecycleService is exported so the hub module routes its status
  // changes through the same centralized state machine (docs/08-STATE-MACHINE.md).
  exports: [ParcelsService, ParcelLifecycleService],
})
export class ParcelsModule {}
