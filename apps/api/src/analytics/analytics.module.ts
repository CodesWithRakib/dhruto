import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
  DeliveryAttempt,
  ParcelScan,
  Settlement,
  Notification,
  WebhookDelivery,
  IntegrationFailure,
  AddressParse,
  AddressConfirmation,
  RecipientRiskSnapshot,
  RtoPrediction,
  HubUserAssignment,
} from '../database/entities';
import { User } from '../database/entities/User.entity.js';
import { AnalyticsAlert } from '../database/entities/AnalyticsAlert.entity.js';
import { ReportExport } from '../database/entities/ReportExport.entity.js';
import { IntelligenceRecommendation } from '../database/entities/IntelligenceRecommendation.entity.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsMetricsService } from './analytics-metrics.service.js';
import { AnalyticsDomainService } from './analytics-domain.service.js';
import { AnalyticsRangeService } from './analytics-range.service.js';
import { AnalyticsAlertService } from './analytics-alert.service.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { AnalyticsExportProcessor } from './analytics-export.processor.js';
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
      DeliveryAttempt,
      ParcelScan,
      Settlement,
      Notification,
      WebhookDelivery,
      IntegrationFailure,
      AddressParse,
      AddressConfirmation,
      RecipientRiskSnapshot,
      RtoPrediction,
      HubUserAssignment,
      User,
      AnalyticsAlert,
      ReportExport,
      IntelligenceRecommendation,
    ]),
    BullModule.registerQueue({ name: 'analytics-exports' }),
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsMetricsService,
    AnalyticsDomainService,
    AnalyticsRangeService,
    AnalyticsAlertService,
    AnalyticsExportService,
    AnalyticsExportProcessor,
  ],
  exports: [
    AnalyticsService,
    AnalyticsMetricsService,
    AnalyticsDomainService,
    AnalyticsRangeService,
    AnalyticsAlertService,
    AnalyticsExportService,
  ],
})
export class AnalyticsModule {}
