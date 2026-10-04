import { Module } from "@nestjs/common";
import { ParcelsController } from "./parcels.controller.js";
import { ParcelsService } from "./parcels.service.js";

@Module({
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
