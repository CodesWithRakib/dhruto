import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Parcel } from "../database/entities/index.js";
import { AddressParserService } from "./services/address-parser.service.js";
import { RiskScoringService } from "./services/risk-scoring.service.js";
import { IntelligenceService } from "./intelligence.service.js";
import { IntelligenceController } from "./intelligence.controller.js";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Parcel])],
  controllers: [IntelligenceController],
  providers: [AddressParserService, RiskScoringService, IntelligenceService],
  exports: [IntelligenceService, AddressParserService, RiskScoringService],
})
export class IntelligenceModule {}
