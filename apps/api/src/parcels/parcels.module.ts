import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ParcelsController } from "./parcels.controller.js";
import { TrackingController } from "./tracking.controller.js";
import { ParcelsService } from "./parcels.service.js";
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
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
