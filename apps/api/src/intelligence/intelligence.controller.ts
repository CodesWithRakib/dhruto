import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { IntelligenceService } from "./intelligence.service.js";
import { IntelligenceFacadeService } from "./services/intelligence-facade.service.js";
import { RecommendationEngineService } from "./services/recommendation.service.js";
import {
  IntelligenceFeedbackService,
  ModelRegistryService,
} from "./services/model-registry.service.js";
import { GeoDataService } from "./services/geo-data.service.js";
import {
  AddressParseDto,
  RecipientRiskEvaluateDto,
  AddressParseV2Dto,
  AddressConfirmDto,
  RecommendationOverrideDto,
  IntelligenceFeedbackDto,
} from "./dto/intelligence.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/index.js";
import { MerchantsService } from "../merchants/merchants.service.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import type { AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import type { RequestWithId } from "../common/middleware/request-id.middleware.js";
import type { ConfirmationSource } from "@dhruto/contracts";

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
 * Intelligence API (Phase 6).
 *
 * Advisory only: every endpoint reads or records decision-support state.
 * Nothing here mutates parcels, wallets, settlements or payouts.
 * All routes require authentication + role-appropriate access.
 */
@ApiTags("Intelligence")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller("intelligence")
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly facade: IntelligenceFacadeService,
    private readonly recommendations: RecommendationEngineService,
    private readonly feedback: IntelligenceFeedbackService,
    private readonly models: ModelRegistryService,
    private readonly geo: GeoDataService,
    private readonly merchantsService: MerchantsService,
  ) {}

  private async merchantIdFor(user: AuthenticatedUser): Promise<string | undefined> {
    if (user.role !== UserRole.MERCHANT) return undefined;
    const profile = await this.merchantsService.findByUserId(user.id);
    return profile?.id;
  }

  private confirmationSourceFor(role: UserRole): ConfirmationSource {
    if (role === UserRole.ADMIN) return "admin";
    if (role === UserRole.HUB_MANAGER) return "operator";
    return "merchant";
  }

  @Post("parse-address")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "intelligence-parse" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Parse and normalize Bangladesh address (legacy shape)" })
  @ApiResponse({ status: 200, description: "Parsed address." })
  async parseAddress(@Body() dto: AddressParseDto, @Req() req?: RequestWithId) {
    const result = this.intelligenceService.parseAddress(dto);
    return envelope(HttpStatus.OK, "Address parsed and normalized successfully", result, req);
  }

  @Post("evaluate-risk")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "intelligence-risk" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Evaluate recipient delivery history and RTO risk score" })
  async evaluateRisk(@Body() dto: RecipientRiskEvaluateDto, @Req() req?: RequestWithId) {
    const result = await this.intelligenceService.evaluateRisk(dto);
    return envelope(HttpStatus.OK, "Recipient risk evaluation completed successfully", result, req);
  }

  @Post("analyze-booking")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "intelligence-analyze" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Address normalization + recipient risk profile" })
  async analyzeBooking(@Body() dto: RecipientRiskEvaluateDto, @Req() req?: RequestWithId) {
    const result = await this.intelligenceService.analyzeBooking(dto);
    return envelope(HttpStatus.OK, "Booking intelligence analysis completed", result, req);
  }

  @Post("address/parse")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "intelligence-parse-v2" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Versioned address parse with candidates and conflict detection",
    description:
      "Returns structured address, 0..1 confidence, match method, parser/dataset versions and candidates. Low-confidence or ambiguous results require confirmation.",
  })
  @ApiResponse({ status: 200, description: "Versioned parse result." })
  async parseAddressV2(@Body() dto: AddressParseV2Dto, @Req() req?: RequestWithId) {
    const result = await this.facade.parseAddressV2(dto);
    return envelope(HttpStatus.OK, "Address parsed successfully", result, req);
  }

  @Post("address/confirm")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "intelligence-confirm" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Confirm a parse result (candidate pick or manual correction)",
    description:
      "Original address is preserved; the confirmation is recorded with actor, source and timestamp.",
  })
  async confirmAddress(
    @Body() dto: AddressConfirmDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.facade.confirmAddress(
      dto.parseId,
      {
        candidateIndex: dto.candidateIndex,
        manualStructure: dto.manualStructure,
        reason: dto.reason,
      },
      user.id,
      this.confirmationSourceFor(user.role),
    );
    return envelope(HttpStatus.OK, "Address confirmation recorded", result, req);
  }

  @Get("parcels/:id/intelligence")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Parcel intelligence: address, risk snapshot, RTO prediction, recommendations",
    description:
      "Merchant callers only see their own parcels. Risk internals are never exposed to customers.",
  })
  async parcelIntelligence(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.merchantIdFor(user);
    const result = await this.facade.parcelIntelligence(id, {
      merchantId,
      role: user.role,
    });
    return envelope(HttpStatus.OK, "Parcel intelligence retrieved successfully", result, req);
  }

  @Post("recommendations/:id/override")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "intelligence-override" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Override a recommendation (audited)",
    description: "Records actor, decision, reason and timestamp. Advisory only.",
  })
  async overrideRecommendation(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: RecommendationOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.recommendations.override(id, user.id, dto.decision, dto.reason);
    return envelope(HttpStatus.OK, "Recommendation override recorded", result, req);
  }

  @Post("recommendations/:id/accept")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept a recommendation (feedback)" })
  async acceptRecommendation(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    await this.recommendations.setStatus(id, "ACCEPTED");
    return envelope(HttpStatus.OK, "Recommendation accepted", { id }, req);
  }

  @Post("recommendations/:id/dismiss")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Dismiss a recommendation (feedback)" })
  async dismissRecommendation(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    await this.recommendations.setStatus(id, "DISMISSED");
    return envelope(HttpStatus.OK, "Recommendation dismissed", { id }, req);
  }

  @Post("feedback")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "intelligence-feedback" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record intelligence feedback",
    description: "Stored for future model improvement; never auto-trains.",
  })
  async recordFeedback(
    @Body() dto: IntelligenceFeedbackDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.feedback.record(dto, user.id);
    return envelope(HttpStatus.OK, "Feedback recorded", { id: result.id }, req);
  }

  @Get("models")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Scoring model registry (versions and status)" })
  async listModels(@Req() req?: RequestWithId) {
    const result = await this.models.list();
    return envelope(HttpStatus.OK, "Model registry retrieved successfully", result, req);
  }

  @Get("health")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Intelligence health: parser/dataset versions, metrics" })
  async health(@Req() req?: RequestWithId) {
    const [metrics, models] = await Promise.all([this.models.metrics(), this.models.list()]);
    return envelope(
      HttpStatus.OK,
      "Intelligence health retrieved successfully",
      {
        parserVersion: "address-parser-v1.0",
        datasetVersion: this.geo.datasetVersion,
        datasetSource: this.geo.source,
        districts: this.geo.districtCount(),
        thanas: this.geo.thanaCount(),
        models: models.filter((m) => m.status === "ACTIVE"),
        metrics,
      },
      req,
    );
  }

  @Get("geography/search")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Candidate geography lookup for confirmation UI" })
  async searchGeography(
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const query = (q ?? "").trim().slice(0, 100);
    const max = Math.min(10, Math.max(1, Number(limit) || 5));
    if (query.length < 2) {
      return envelope(HttpStatus.OK, "Query too short", [], req);
    }
    const result = await this.facade.parseAddressV2({
      rawAddress: query,
      includeCandidates: true,
      maxCandidates: max,
    });
    return envelope(HttpStatus.OK, "Geography candidates retrieved", result.candidates, req);
  }
}
