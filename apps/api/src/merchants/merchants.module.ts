import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Merchant, Parcel, User } from "../database/entities/index.js";
import { MerchantsService } from "./merchants.service.js";
import { MerchantsController } from "./merchants.controller.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([Merchant, Parcel, User]),
    AuthModule,
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
