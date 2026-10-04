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
} from "../database/entities/index.js";
import { RidersController } from "./riders.controller.js";
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
    ]),
  ],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
