import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  User,
  Merchant,
  Hub,
  Rider,
  Parcel,
  ParcelStatusHistory,
  CashLedger,
  Wallet,
  WalletTransaction,
  PayoutRequest,
  Notification,
  HubUserAssignment,
  FinancialTransaction,
  FinancialEntry,
} from '../entities/index.js';
import { SeederService } from './seeder.service.js';

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
      Wallet,
      WalletTransaction,
      PayoutRequest,
      Notification,
      HubUserAssignment,
      FinancialTransaction,
      FinancialEntry,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
