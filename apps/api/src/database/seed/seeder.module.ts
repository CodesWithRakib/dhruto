import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  User,
  Merchant,
  Hub,
  Rider,
  Parcel,
  ParcelStatusHistory,
  CashLedger,
  DeliveryAttempt,
  Wallet,
  WalletTransaction,
  PayoutRequest,
  Notification,
  HubUserAssignment,
  FinancialTransaction,
  FinancialEntry,
  WebhookSubscription,
} from "../entities/index.js";
import { SeederService } from "./seeder.service.js";
import { SeedCoreService } from "./seed-core.service.js";
import { SeedParcelsService } from "./seed-parcels.service.js";
import { SeedFinanceService } from "./seed-finance.service.js";
import { SeedIntelligenceService } from "./seed-intelligence.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Merchant,
      Hub,
      Rider,
      Parcel,
      ParcelStatusHistory,
      CashLedger,
      DeliveryAttempt,
      Wallet,
      WalletTransaction,
      PayoutRequest,
      Notification,
      HubUserAssignment,
      FinancialTransaction,
      FinancialEntry,
      WebhookSubscription,
    ]),
  ],
  providers: [
    SeedCoreService,
    SeedParcelsService,
    SeedFinanceService,
    SeedIntelligenceService,
    SeederService,
  ],
  exports: [SeederService],
})
export class SeederModule {}
