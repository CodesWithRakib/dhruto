import { Controller, Get, Post, HttpStatus, HttpCode, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeoDataService } from "./services/geo-data.service.js";
import { ModelRegistryService } from "./services/model-registry.service.js";
import { GeoDatasetVersion } from "../database/entities/GeoDatasetVersion.entity.js";
import { IntelligenceRecommendation } from "../database/entities/IntelligenceRecommendation.entity.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { UserRole } from "../database/entities/index.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import type { RequestWithId } from "../common/middleware/request-id.middleware.js";

function envelope(statusCode: number, message: string, data: unknown, req?: RequestWithId) {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      requestId: req?.requestId || "unknown",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Admin intelligence controls: dataset versions, model registry, prediction
 * metrics, override review. Dangerous changes require admin role and are
 * audited via structured logs.
 */
@ApiTags("Intelligence Admin")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/intelligence")
export class IntelligenceAdminController {
  constructor(
    private readonly geo: GeoDataService,
    private readonly models: ModelRegistryService,
    @InjectRepository(GeoDatasetVersion)
    private readonly datasetRepo: Repository<GeoDatasetVersion>,
    @InjectRepository(IntelligenceRecommendation)
    private readonly recommendationRepo: Repository<IntelligenceRecommendation>,
  ) {}

  @Get("versions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Parser, dataset and model versions" })
  @ApiResponse({ status: 200, description: "Version inventory." })
  async versions(@Req() req?: RequestWithId) {
    const [datasets, models] = await Promise.all([
      this.datasetRepo.find({ order: { importedAt: "DESC" }, take: 10 }),
      this.models.list(),
    ]);
    return envelope(
      HttpStatus.OK,
      "Intelligence versions retrieved successfully",
      {
        parserVersion: "address-parser-v1.0",
        activeDataset: this.geo.datasetVersion,
        datasets: datasets.map((d) => ({
          version: d.version,
          source: d.source,
          importedAt: d.importedAt.toISOString(),
          divisions: d.divisions,
          districts: d.districts,
          upazilas: d.upazilas,
          aliases: d.aliases,
          status: d.status,
        })),
        models,
      },
      req,
    );
  }

  @Post("geography/import")
  @RateLimit({ limit: 5, windowSeconds: 300, scope: "geo-import" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Import (or re-import) the compiled geography dataset",
    description: "Idempotent code-keyed upserts; old versions are superseded, never deleted.",
  })
  async importGeography(@Req() req?: RequestWithId) {
    const result = await this.geo.ensureImported();
    return envelope(HttpStatus.OK, "Geography dataset imported successfully", result, req);
  }

  @Get("metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Prediction/parsing metrics for operations" })
  async metrics(@Req() req?: RequestWithId) {
    const metrics = await this.models.metrics();
    return envelope(HttpStatus.OK, "Intelligence metrics retrieved successfully", metrics, req);
  }

  @Get("overrides")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manual recommendation overrides under review" })
  async overrides(@Req() req?: RequestWithId) {
    const rows = await this.recommendationRepo.find({
      where: { status: "OVERRIDDEN" },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return envelope(
      HttpStatus.OK,
      "Recommendation overrides retrieved successfully",
      rows.map((r) => ({
        id: r.id,
        parcelId: r.parcelId,
        action: r.action,
        overriddenBy: r.overriddenBy,
        overriddenAt: r.overriddenAt?.toISOString() ?? null,
        overrideReason: r.overrideReason,
        overrideDecision: r.overrideDecision,
      })),
      req,
    );
  }
}
