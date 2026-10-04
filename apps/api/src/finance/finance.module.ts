import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Wallet,
  WalletTransaction,
  PayoutRequest,
  CashLedger,
  Merchant,
  Parcel,
  ParcelStatusHistory,
} from "../database/entities/index.js";
import { FinanceService } from "./finance.service.js";
import { FinanceController } from "./finance.controller.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      WalletTransaction,
      PayoutRequest,
      CashLedger,
      Merchant,
      Parcel,
      ParcelStatusHistory,
    ]),
    MerchantsModule,
    AuthModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
