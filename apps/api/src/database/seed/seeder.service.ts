import { Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { SeedCoreService } from "./seed-core.service.js";
import { SeedParcelsService } from "./seed-parcels.service.js";
import { SeedFinanceService } from "./seed-finance.service.js";
import { SeedIntelligenceService } from "./seed-intelligence.service.js";

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly seedCoreService: SeedCoreService,
    private readonly seedParcelsService: SeedParcelsService,
    private readonly seedFinanceService: SeedFinanceService,
    private readonly seedIntelligenceService: SeedIntelligenceService,
  ) {}

  async seed() {
    this.logger.log("Starting deterministic production database seeding...");
    const defaultPasswordHash = await bcrypt.hash("dhruto123", 10);

    // 1. Core fixtures: Hubs, Users, Merchants, Wallets, Riders, Hub Assignments
    const coreCtx = await this.seedCoreService.seedCore(defaultPasswordHash);

    // 2. Parcels & Chronological Status Histories
    const { parcelMap, stats: parcelStats } = await this.seedParcelsService.seedParcels(coreCtx);

    // 3. Finance & Communication fixtures
    const financeStats = await this.seedFinanceService.seedFinance(coreCtx, parcelMap);

    // 4. Intelligence delivery attempts, Geo dataset & ML model defaults
    const intelligenceStats = await this.seedIntelligenceService.seedIntelligence(coreCtx, parcelMap);

    const mergedStats = {
      ...coreCtx.stats,
      ...parcelStats,
      ...financeStats,
      ...intelligenceStats,
    };

    return {
      success: true,
      stats: mergedStats,
    };
  }
}
