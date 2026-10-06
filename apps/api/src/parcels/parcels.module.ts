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
  ],
  controllers: [ParcelsController, TrackingController],
  providers: [
    ParcelsService,
    ParcelLifecycleService,
    TrackingCodeService,
    RateLimitGuard,
  ],
  exports: [ParcelsService],
})
export class ParcelsModule {}
