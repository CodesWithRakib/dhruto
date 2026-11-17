import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryAttempt, Parcel } from "../entities/index.js";
import { SEED_INTELLIGENCE_ATTEMPTS } from "./seed-intelligence.data.js";
import { GeoDataService } from "../../intelligence/services/geo-data.service.js";
import { ModelRegistryService } from "../../intelligence/services/model-registry.service.js";
import type { CoreSeedContext } from "./seed.types.js";

@Injectable()
export class SeedIntelligenceService {
  private readonly logger = new Logger(SeedIntelligenceService.name);

  constructor(
    @InjectRepository(DeliveryAttempt)
    private readonly attemptRepo: Repository<DeliveryAttempt>,
    private readonly geoDataService: GeoDataService,
    private readonly modelRegistry: ModelRegistryService,
  ) {}

  async seedIntelligence(
    ctx: CoreSeedContext,
    parcelMap: Map<string, Parcel>,
  ): Promise<Record<string, number>> {
    const now = Date.now();
    const stats: Record<string, number> = {};

    let attemptCount = 0;
    for (const aData of SEED_INTELLIGENCE_ATTEMPTS) {
      const parcel = parcelMap.get(aData.trackingCode);
      const rider = aData.riderEmail ? ctx.riderMap.get(aData.riderEmail) : null;
      if (!parcel || !rider) continue;

      const existing = await this.attemptRepo.findOne({
        where: { parcelId: parcel.id, attemptNumber: aData.attemptNumber },
      });
      if (!existing) {
        const attempt = this.attemptRepo.create({
          parcelId: parcel.id,
          riderId: rider.id,
          attemptNumber: aData.attemptNumber,
          outcome: aData.outcome,
          failureReason: aData.failureReason ?? null,
          notes: aData.notes ?? null,
          rescheduledFor: null,
          metadata: { seeded: true },
        });
        attempt.createdAt = new Date(now - aData.hoursAgo * 3600 * 1000);
        await this.attemptRepo.save(attempt);
        attemptCount++;
      }
    }
    stats.deliveryAttempts = attemptCount;
    this.logger.log(`✓ Seeded ${attemptCount} intelligence delivery attempts`);

    try {
      const geo = await this.geoDataService.ensureImported();
      stats.geoDistricts = geo.districts;
      stats.geoUpazilas = geo.upazilas;
      this.logger.log(
        `✓ Geography dataset ${geo.version}: ${geo.districts} districts, ${geo.upazilas} upazilas`,
      );
    } catch (error) {
      this.logger.warn(
        `Geography import skipped: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    try {
      await this.modelRegistry.ensureDefaults();
      this.logger.log("✓ Scoring model defaults ensured");
    } catch (error) {
      this.logger.warn(
        `Model defaults skipped: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return stats;
  }
}
