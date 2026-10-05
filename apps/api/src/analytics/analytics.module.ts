import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Parcel,
  ParcelStatusHistory,
  Rider,
  Hub,
  CashLedger,
  Wallet,
  PayoutRequest,
  Bag,
  Manifest,
  Merchant,
} from '../database/entities';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parcel,
      ParcelStatusHistory,
      Rider,
      Hub,
      CashLedger,
      Wallet,
      PayoutRequest,
      Bag,
      Manifest,
      Merchant,
    ]),
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
