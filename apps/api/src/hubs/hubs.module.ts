import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Hub,
  Bag,
  BagParcel,
  Manifest,
  Parcel,
  ParcelStatusHistory,
} from "../database/entities/index.js";
import { HubsService } from "./hubs.service.js";
import { HubsController } from "./hubs.controller.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hub,
      Bag,
      BagParcel,
      Manifest,
      Parcel,
      ParcelStatusHistory,
    ]),
  ],
  controllers: [HubsController],
  providers: [HubsService],
  exports: [HubsService],
})
export class HubsModule {}
