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
  Rider,
} from "../database/entities/index.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { ParcelsModule } from "../parcels/parcels.module.js";
import { HubsService } from "./hubs.service.js";
import { HubsController } from "./hubs.controller.js";
import { HubAuthorizationService } from "./hub-authorization.service.js";
import { PickupService } from "./pickups/pickup.service.js";
import { PickupsController } from "./pickups/pickups.controller.js";

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
      Rider,
    ]),
    // Supplies ParcelLifecycleService so hub transitions go through the same
    // centralized state machine as merchant flows.
    ParcelsModule,
    // Supplies OutboxService for the pickup leg events (parcel.picked_up).
    IntegrationsModule,
  ],
  controllers: [HubsController, PickupsController],
  providers: [HubsService, HubAuthorizationService, PickupService],
  exports: [HubsService, HubAuthorizationService],
})
export class HubsModule {}
