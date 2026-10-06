import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  FinancialEntry,
  FinancialTransaction,
} from "../../database/entities/index.js";
import { LedgerService } from "./ledger.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransaction, FinancialEntry])],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
