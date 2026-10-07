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
  FinancialTransaction,
  FinancialEntry,
  Settlement,
  SettlementBatch,
  CashHandIn,
  CashHandInItem,
  CashDiscrepancy,
  HubUserAssignment,
  Rider,
  Hub,
} from "../database/entities/index.js";
import { FinanceService } from "./finance.service.js";
import { FinanceController, FinanceAdminController, HubCashController } from "./finance.controller.js";
import { LedgerModule } from "./ledger/ledger.module.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
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
      FinancialTransaction,
      FinancialEntry,
      Settlement,
      SettlementBatch,
      CashHandIn,
      CashHandInItem,
      CashDiscrepancy,
      HubUserAssignment,
      Rider,
      Hub,
    ]),
    MerchantsModule,
    AuthModule,
    LedgerModule,
    // OutboxService for transactional domain-event emission.
    IntegrationsModule,
  ],
  controllers: [FinanceController, FinanceAdminController, HubCashController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
