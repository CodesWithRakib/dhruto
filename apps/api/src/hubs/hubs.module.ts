import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Bag,
  BagParcel,
  Hub,
  HubUserAssignment,
  Manifest,
  ManifestItem,
  OperationalException,
  Parcel,
  ParcelScan,
  ParcelStatusHistory,
} from "../database/entities/index.js";
import { ParcelsModule } from "../parcels/parcels.module.js";
import { HubsService } from "./hubs.service.js";
import { HubsController } from "./hubs.controller.js";
import { HubAuthorizationService } from "./hub-authorization.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hub,
      HubUserAssignment,
      Bag,
      BagParcel,
      Manifest,
      ManifestItem,
      ParcelScan,
      OperationalException,
      Parcel,
      ParcelStatusHistory,
    ]),
    // Supplies ParcelLifecycleService so hub transitions go through the same
    // centralized state machine as merchant flows.
    ParcelsModule,
  ],
  controllers: [HubsController],
  providers: [HubsService, HubAuthorizationService],
  exports: [HubsService, HubAuthorizationService],
})
export class HubsModule {}
