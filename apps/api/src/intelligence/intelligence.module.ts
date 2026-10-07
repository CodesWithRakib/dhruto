import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { Parcel } from "../database/entities/Parcel.entity.js";
import { Merchant } from "../database/entities/Merchant.entity.js";
import { DeliveryAttempt } from "../database/entities/DeliveryAttempt.entity.js";
import { CashLedger } from "../database/entities/CashLedger.entity.js";
import { GeoDatasetVersion } from "../database/entities/GeoDatasetVersion.entity.js";
import { GeoPlace } from "../database/entities/GeoPlace.entity.js";
import { AddressAlias } from "../database/entities/AddressAlias.entity.js";
import { AddressParse } from "../database/entities/AddressParse.entity.js";
import { AddressConfirmation } from "../database/entities/AddressConfirmation.entity.js";
import { RecipientFeatureAggregate } from "../database/entities/RecipientFeatureAggregate.entity.js";
import { RecipientRiskSnapshot } from "../database/entities/RecipientRiskSnapshot.entity.js";
import { RtoPrediction } from "../database/entities/RtoPrediction.entity.js";
import { IntelligenceRecommendation } from "../database/entities/IntelligenceRecommendation.entity.js";
import { IntelligenceFeedback } from "../database/entities/IntelligenceFeedback.entity.js";
import { ScoringModel } from "../database/entities/ScoringModel.entity.js";
import { AddressParserService } from "./services/address-parser.service.js";
import { RiskScoringService } from "./services/risk-scoring.service.js";
import { IntelligenceService } from "./intelligence.service.js";
import { IntelligenceController } from "./intelligence.controller.js";
import { GeoDataService } from "./services/geo-data.service.js";
import { AddressIntelligenceService } from "./services/address-intelligence.service.js";
import { RecipientFeaturesService } from "./services/recipient-features.service.js";
import { RiskEngineService } from "./services/risk-engine.service.js";
import { RuleBasedRtoEngine, RtoPredictionService } from "./services/rto-engine.service.js";
import { RecommendationEngineService } from "./services/recommendation.service.js";
import {
  IntelligenceFeedbackService,
  ModelRegistryService,
} from "./services/model-registry.service.js";
import { IntelligenceFacadeService } from "./services/intelligence-facade.service.js";
import { IntelligenceAdminController } from "./intelligence-admin.controller.js";
import { MerchantsModule } from "../merchants/merchants.module.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parcel,
      Merchant,
      DeliveryAttempt,
      CashLedger,
      GeoDatasetVersion,
      GeoPlace,
      AddressAlias,
      AddressParse,
      AddressConfirmation,
      RecipientFeatureAggregate,
      RecipientRiskSnapshot,
      RtoPrediction,
      IntelligenceRecommendation,
      IntelligenceFeedback,
      ScoringModel,
    ]),
    BullModule.registerQueue({ name: "notifications" }),
    MerchantsModule,
  ],
  controllers: [IntelligenceController, IntelligenceAdminController],
  providers: [
    AddressParserService,
    RiskScoringService,
    IntelligenceService,
    GeoDataService,
    AddressIntelligenceService,
    RecipientFeaturesService,
    RiskEngineService,
    RuleBasedRtoEngine,
    RtoPredictionService,
    RecommendationEngineService,
    IntelligenceFeedbackService,
    ModelRegistryService,
    IntelligenceFacadeService,
  ],
  exports: [
    IntelligenceService,
    AddressParserService,
    RiskScoringService,
    GeoDataService,
    AddressIntelligenceService,
    RecipientFeaturesService,
    RiskEngineService,
    RuleBasedRtoEngine,
    RtoPredictionService,
    RecommendationEngineService,
    IntelligenceFeedbackService,
    ModelRegistryService,
    IntelligenceFacadeService,
  ],
})
export class IntelligenceModule {}
