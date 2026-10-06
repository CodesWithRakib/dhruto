import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Parcel,
  ParcelStatusHistory,
  ParcelAssignment,
  CashLedger,
  Rider,
  Hub,
  User,
  DeliveryAttempt,
  HubUserAssignment,
} from "../database/entities/index.js";
import { ParcelsModule } from "../parcels/parcels.module.js";
import { RidersController, RiderAdminController } from "./riders.controller.js";
import { RidersService } from "./riders.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parcel,
      ParcelStatusHistory,
      ParcelAssignment,
      CashLedger,
      Rider,
      Hub,
      User,
      DeliveryAttempt,
      HubUserAssignment,
    ]),
    // Supplies ParcelLifecycleService so rider transitions go through the
    // same centralized state machine as hub operations.
    ParcelsModule,
  ],
  controllers: [RidersController, RiderAdminController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
