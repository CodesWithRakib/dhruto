import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service.js";
import { AnalyticsMetricsService } from "./analytics-metrics.service.js";
import { AnalyticsDomainService } from "./analytics-domain.service.js";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import { AnalyticsAlertService } from "./analytics-alert.service.js";
import { AnalyticsExportService } from "./analytics-export.service.js";
import {
  AnalyticsQueryDto,
  AnalyticsRangeQueryDto,
  ExportRequestDto,
} from "./dto/analytics.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/index.js";
import { HubUserAssignment } from "../database/entities/HubUserAssignment.entity.js";
import { Merchant } from "../database/entities/Merchant.entity.js";
import { Rider } from "../database/entities/Rider.entity.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { CacheService } from "../common/cache/cache.service.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Optional } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import type { RequestWithId } from "../common/middleware/request-id.middleware.js";
import { ApiErrorCode, METRIC_CATALOG, type AlertStatus } from "@dhruto/contracts";
import type { TenantScope } from "./analytics-metrics.service.js";

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

function kpi(
  value: number | null,
  previous: number | null,
): {
  value: number | null;
  previous: number | null;
  changePct: number | null;
  trend: "up" | "down" | "flat";
  noData: boolean;
} {
  return {
    value,
    previous,
    changePct:
      value !== null && previous !== null && previous !== 0
        ? Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10
        : null,
    trend:
      value === null || previous === null
        ? "flat"
        : value > previous
          ? "up"
          : value < previous
            ? "down"
            : "flat",
    noData: value === null && previous === null,
  };
}

/**
 * Analytics API (Phase 7).
 *
 * Read-only: every endpoint aggregates transactional data, none mutates it.
 * Tenant scoping is enforced at the query layer — merchant callers always
 * resolve to their own merchant id (the `merchantId` query param is honored
 * for ADMIN only), hub managers are confined to assigned hubs, riders to
 * their own record.
 */
@ApiTags("Analytics")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly metrics: AnalyticsMetricsService,
    private readonly domain: AnalyticsDomainService,
    private readonly ranges: AnalyticsRangeService,
    private readonly alerts: AnalyticsAlertService,
    private readonly exports: AnalyticsExportService,
    @InjectRepository(HubUserAssignment)
    private readonly hubAssignmentRepo: Repository<HubUserAssignment>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @Optional() private readonly cache?: CacheService,
  ) {}

  /* ---------------- scope resolution (query layer) ---------------- */

  private async merchantIdFor(
    user: AuthenticatedUser,
    override?: string,
  ): Promise<string | undefined> {
    if (user.role === UserRole.ADMIN && override) return override;
    if (user.role !== UserRole.MERCHANT) return undefined;
    const merchant = await this.merchantRepo.findOne({ where: { userId: user.id } });
    if (!merchant) {
      throw new NotFoundException({
        message: "Merchant profile not found",
        error: ApiErrorCode.MERCHANT_NOT_FOUND,
      });
    }
    return merchant.id;
  }

  private async hubScopeFor(user: AuthenticatedUser, hubId?: string): Promise<string | undefined> {
    if (user.role === UserRole.ADMIN) return hubId;
    if (user.role !== UserRole.HUB_MANAGER) return hubId;
    const assignments = await this.hubAssignmentRepo.find({
      where: { userId: user.id, isActive: true },
    });
    const allowed = assignments.map((a) => a.hubId);
    if (allowed.length === 0) {
      throw new ForbiddenException({
        message: "No hub assignment",
        error: ApiErrorCode.ANALYTICS_SCOPE_FORBIDDEN,
      });
    }
    if (hubId && !allowed.includes(hubId)) {
      throw new ForbiddenException({
        message: "Hub out of scope",
        error: ApiErrorCode.ANALYTICS_SCOPE_FORBIDDEN,
      });
    }
    return hubId ?? allowed[0];
  }

  private async riderIdFor(user: AuthenticatedUser): Promise<string> {
    const rider = await this.riderRepo.findOne({ where: { userId: user.id } });
    if (!rider) {
      throw new NotFoundException({ message: "Rider profile not found", error: "RIDER_NOT_FOUND" });
    }
    return rider.id;
  }

  private rangeOf(query: AnalyticsRangeQueryDto) {
    return this.ranges.resolve({
      preset: (query.preset as never) ?? "30d",
      from: query.from,
      to: query.to,
      timezone: query.timezone,
    });
  }

  private cached<T>(key: string, fn: () => Promise<T>, ttl = 120): Promise<T> {
    if (this.cache) return this.cache.wrap(key, fn, ttl);
    return fn();
  }

  /* ---------------- legacy endpoints (secured, real numbers) ---------------- */

  @Get("merchant/summary")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-merchant" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Merchant analytics KPIs (tenant-isolated)" })
  async getMerchantSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const merchantId = await this.merchantIdFor(user, query.merchantId);
    if (!merchantId) {
      throw new ForbiddenException({
        message: "Merchant scope required",
        error: ApiErrorCode.ANALYTICS_SCOPE_FORBIDDEN,
      });
    }
    const data = await this.analyticsService.getMerchantSummary(merchantId, query);
    return envelope(HttpStatus.OK, "Merchant analytics retrieved successfully", data, req);
  }

  @Get("operations/overview")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-ops" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Platform operational overview (admin / hub-scoped)" })
  async getOperationalOverview(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const hubId = await this.hubScopeFor(user, query.hubId);
    const data = await this.analyticsService.getOperationalSummary({ ...query, hubId });
    return envelope(HttpStatus.OK, "Operational overview retrieved successfully", data, req);
  }

  @Get("hubs/throughput")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-hubs" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hub throughput (scoped)" })
  async getHubThroughput(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const hubId = await this.hubScopeFor(user, query.hubId);
    const data = await this.analyticsService.getHubThroughputAnalytics({ ...query, hubId });
    return envelope(HttpStatus.OK, "Hub throughput metrics retrieved successfully", data, req);
  }

  @Get("riders/performance")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-riders" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rider performance (scoped)" })
  async getRiderPerformance(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const hubId = await this.hubScopeFor(user, query.hubId);
    const data = await this.analyticsService.getRiderPerformanceAnalytics({ ...query, hubId });
    return envelope(HttpStatus.OK, "Rider performance rankings retrieved successfully", data, req);
  }

  @Get("rto")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-rto" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "RTO analytics (scoped)" })
  async getRtoAnalytics(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.tenantScope(user, {});
    const data = await this.analyticsService.getRtoAnalytics(query, scope);
    return envelope(HttpStatus.OK, "RTO analytics retrieved successfully", data, req);
  }

  @Get("cod")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-cod" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "COD flow (scoped)" })
  async getCodAnalytics(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.tenantScope(user, {});
    const data = await this.analyticsService.getCodAnalytics(query, scope);
    return envelope(HttpStatus.OK, "COD analytics retrieved successfully", data, req);
  }

  /* ---------------- Phase 7 endpoints ---------------- */

  @Get("metrics")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Centralized metric catalog" })
  async metricCatalog(@Req() req: RequestWithId) {
    return envelope(
      HttpStatus.OK,
      "Metric catalog retrieved successfully",
      Object.values(METRIC_CATALOG),
      req,
    );
  }

  @Get("overview")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-overview" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Executive overview with previous-period KPIs" })
  @ApiResponse({ status: 200, description: "Overview." })
  async overview(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope: TenantScope = {};
    if (user.role === UserRole.MERCHANT) scope.merchantId = await this.merchantIdFor(user);
    else if (query.merchantId && user.role === UserRole.ADMIN) scope.merchantId = query.merchantId;
    if (user.role === UserRole.HUB_MANAGER || (user.role === UserRole.ADMIN && query.hubId)) {
      scope.hubId = await this.hubScopeFor(user, query.hubId);
    }
    const key = `analytics:overview:v1:${user.role}:${scope.merchantId ?? ""}:${scope.hubId ?? ""}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.buildOverview(scope, range), 120);
    return envelope(HttpStatus.OK, "Analytics overview retrieved successfully", data, req);
  }

  private async buildOverview(
    scope: TenantScope,
    range: ReturnType<AnalyticsRangeService["resolve"]>,
  ) {
    const prevRange = { ...range, from: range.previousFrom, to: range.previousTo };
    const [cur, prev, trends, finance] = await Promise.all([
      this.metrics.statusCounts(scope, range),
      this.metrics.statusCounts(scope, prevRange),
      this.metrics.trends(scope, range),
      this.domain.finance(scope, range),
    ]);
    const elig = this.metrics.eligible(cur.delivered, cur.rto, cur.failed, cur.cancelled);
    const prevElig = this.metrics.eligible(prev.delivered, prev.rto, prev.failed, prev.cancelled);
    const lat = await this.metrics.deliveryLatencies(scope, range);
    const prevLat = await this.metrics.deliveryLatencies(scope, prevRange);
    const avg = (a: number[]): number | null =>
      a.length > 0 ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null;
    const cod = await this.domain.cod(scope, range);
    const prevCod = await this.domain.cod(scope, prevRange);
    const merchants = scope.merchantId ? 1 : await this.merchantRepo.count();
    return {
      range,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalParcels: kpi(cur.total, prev.total),
        delivered: kpi(cur.delivered, prev.delivered),
        inTransit: cur.inTransit,
        successRate: kpi(
          this.metrics.rate(cur.delivered, elig),
          this.metrics.rate(prev.delivered, prevElig),
        ),
        rtoRate: kpi(this.metrics.rate(cur.rto, elig), this.metrics.rate(prev.rto, prevElig)),
        avgDeliveryHours: kpi(avg(lat), avg(prevLat)),
        codCollected: kpi(cod.collected, prevCod.collected),
        pendingSettlement: kpi(finance.pendingSettlementMinor / 100, null),
        activeMerchants: merchants,
        activeRiders: 0,
        activeHubs: 0,
      },
      trends,
      generatedAtNote: "Aggregated on read from transactional tables (Asia/Dhaka buckets).",
    };
  }

  @Get("parcels")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-parcels" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Parcel funnel, status breakdown, latency percentiles, bottlenecks" })
  async parcels(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:parcels:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(
      key,
      async () => {
        const [funnelRaw, counts, latencies] = await Promise.all([
          this.metrics.funnel(scope, range),
          this.metrics.statusCounts(scope, range),
          this.metrics.deliveryLatencies(scope, range),
        ]);
        const created = funnelRaw[0]?.count ?? 0;
        const funnel = funnelRaw.map((s, i) => {
          const prevCount = i === 0 ? null : (funnelRaw[i - 1]?.count ?? 0);
          return {
            stage: s.stage,
            count: s.count,
            conversionPct:
              i === 0 ? null : prevCount ? Math.round((s.count / prevCount) * 1000) / 10 : null,
            dropoff: i === 0 || !prevCount ? null : prevCount - s.count,
          };
        });
        void created;
        return {
          range,
          funnel,
          statusBreakdown: counts.byStatus,
          latency: {
            count: latencies.length,
            avgHours:
              latencies.length > 0
                ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
                : null,
            p50: this.metrics.percentile(latencies, 50),
            p75: this.metrics.percentile(latencies, 75),
            p90: this.metrics.percentile(latencies, 90),
            p95: this.metrics.percentile(latencies, 95),
            p99: this.metrics.percentile(latencies, 99),
          },
          bottlenecks: [],
        };
      },
      120,
    );
    return envelope(HttpStatus.OK, "Parcel analytics retrieved successfully", data, req);
  }

  @Get("delivery")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-delivery" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delivery latency percentiles + first-attempt success" })
  async delivery(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:delivery:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(
      key,
      async () => {
        const latencies = await this.metrics.deliveryLatencies(scope, range);
        const riders = await this.metrics.riderStats(range, scope.hubId, 200);
        const attempted = riders.reduce((n, r) => n + r.assigned, 0);
        const firstOk = riders.reduce(
          (n, r) => n + Math.round(((r.firstAttemptSuccess ?? 0) / 100) * r.assigned),
          0,
        );
        return {
          range,
          latency: {
            count: latencies.length,
            avgHours:
              latencies.length > 0
                ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
                : null,
            p50: this.metrics.percentile(latencies, 50),
            p75: this.metrics.percentile(latencies, 75),
            p90: this.metrics.percentile(latencies, 90),
            p95: this.metrics.percentile(latencies, 95),
            p99: this.metrics.percentile(latencies, 99),
          },
          firstAttemptSuccess: attempted > 0 ? Math.round((firstOk / attempted) * 1000) / 10 : null,
        };
      },
      120,
    );
    return envelope(HttpStatus.OK, "Delivery analytics retrieved successfully", data, req);
  }

  @Get("hubs")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-hubs-v2" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hub throughput, backlog and aging" })
  async hubs(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const hubId = await this.hubScopeFor(user, query.hubId);
    const key = `analytics:hubs:v1:${user.role}:${hubId ?? "all"}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.metrics.hubStats(range, hubId), 120);
    return envelope(
      HttpStatus.OK,
      "Hub analytics retrieved successfully",
      { range, hubs: data },
      req,
    );
  }

  @Get("riders")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-riders-v2" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider performance leaderboard (documented metrics, no composite score)",
  })
  async riders(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const hubId = await this.hubScopeFor(user, query.hubId);
    const key = `analytics:riders:v1:${user.role}:${hubId ?? "all"}:${range.from}:${range.to}:${query.limit ?? 50}`;
    const data = await this.cached(
      key,
      () => this.metrics.riderStats(range, hubId, query.limit ?? 50),
      120,
    );
    return envelope(
      HttpStatus.OK,
      "Rider analytics retrieved successfully",
      {
        range,
        riders: data,
        limitations:
          "Performance depends on assigned area, volume, parcel mix and customer availability — compare within hub context.",
      },
      req,
    );
  }

  @Get("riders/me")
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Own rider performance" })
  async myRiderStats(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const riderId = await this.riderIdFor(user);
    const riders = await this.metrics.riderStats(range, undefined, 200);
    const mine = riders.find((r) => r.riderId === riderId) ?? null;
    void riderId;
    return envelope(
      HttpStatus.OK,
      "Own rider analytics retrieved successfully",
      { range, rider: mine },
      req,
    );
  }

  @Get("merchants")
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "analytics-merchants" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Merchant comparison (admin only)" })
  async merchants(@Query() query: AnalyticsRangeQueryDto, @Req() req?: RequestWithId) {
    const range = this.rangeOf(query);
    const key = `analytics:merchants:v1:${range.from}:${range.to}:${query.limit ?? 100}`;
    const data = await this.cached(
      key,
      () => this.metrics.merchantCompare(range, query.limit ?? 100),
      180,
    );
    return envelope(
      HttpStatus.OK,
      "Merchant comparison retrieved successfully",
      { range, merchants: data },
      req,
    );
  }

  @Get("rto/v2")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-rto-v2" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "RTO analytics from real attempt/district/hub data" })
  async rtoV2(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:rto:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.rto(scope, range), 120);
    return envelope(
      HttpStatus.OK,
      "RTO analytics retrieved successfully",
      {
        range,
        ...data,
        costNote:
          "RTO shipping cost is not tracked as a monetary field — showing counts, rates and COD exposure instead of invented costs.",
      },
      req,
    );
  }

  @Get("cod/v2")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-cod-v2" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "COD booked/collected/pending/failed with collection rate" })
  async codV2(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:cod:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.cod(scope, range), 120);
    return envelope(HttpStatus.OK, "COD analytics retrieved successfully", { range, ...data }, req);
  }

  @Get("finance")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-finance" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Read-only financial analytics (finance domain is source of truth)" })
  async finance(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:finance:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.finance(scope, range), 120);
    return envelope(
      HttpStatus.OK,
      "Financial analytics retrieved successfully",
      { range, ...data },
      req,
    );
  }

  @Get("notifications")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-notif" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Notification delivery analytics by channel" })
  async notifications(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:notif:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.notifications(scope, range), 120);
    return envelope(
      HttpStatus.OK,
      "Notification analytics retrieved successfully",
      { range, ...data },
      req,
    );
  }

  @Get("webhooks")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-webhooks" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook delivery analytics (own scope for merchants)" })
  async webhooks(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const range = this.rangeOf(query);
    const scope = await this.tenantScope(user, query);
    const key = `analytics:webhooks:v1:${user.role}:${JSON.stringify(scope)}:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.webhooks(scope, range), 120);
    return envelope(
      HttpStatus.OK,
      "Webhook analytics retrieved successfully",
      { range, ...data },
      req,
    );
  }

  @Get("intelligence")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "analytics-intel" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Intelligence analytics: parsing, risk, prediction quality" })
  async intelligence(@Query() query: AnalyticsRangeQueryDto, @Req() req: RequestWithId) {
    const range = this.rangeOf(query);
    const key = `analytics:intel:v1:${range.from}:${range.to}`;
    const data = await this.cached(key, () => this.domain.intelligence(range), 180);
    return envelope(
      HttpStatus.OK,
      "Intelligence analytics retrieved successfully",
      { range, ...data },
      req,
    );
  }

  @Get("alerts")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Operational alerts" })
  async listAlerts(
    @Query("status") status: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() req: RequestWithId,
  ) {
    const data = await this.alerts.list(
      status === "OPEN" || status === "ACKNOWLEDGED" || status === "RESOLVED"
        ? (status as AlertStatus)
        : undefined,
      limit ? Number(limit) : 100,
    );
    return envelope(HttpStatus.OK, "Alerts retrieved successfully", data, req);
  }

  @Post("alerts/evaluate")
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "analytics-alert-eval" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Evaluate alert rules now (admin)" })
  async evaluateAlerts(@Query() query: AnalyticsRangeQueryDto, @Req() req: RequestWithId) {
    const range = this.rangeOf(query);
    const data = await this.alerts.evaluate({}, range);
    return envelope(HttpStatus.OK, "Alert evaluation completed", data, req);
  }

  @Post("alerts/:id/ack")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Acknowledge an alert" })
  async ackAlert(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const data = await this.alerts.acknowledge(id, user.id);
    return envelope(HttpStatus.OK, "Alert acknowledged", data, req);
  }

  @Get("reports")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List own report exports" })
  async listReports(@CurrentUser() user: AuthenticatedUser, @Req() req: RequestWithId) {
    const data = await this.exports.listForUser(user.id);
    return envelope(HttpStatus.OK, "Report exports retrieved successfully", data, req);
  }

  @Post("reports")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "analytics-export" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a CSV/XLSX export (sync when small, queued when large)" })
  async requestReport(
    @Body() dto: ExportRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.tenantScope(user, {});
    const data = await this.exports.request(dto, scope, { id: user.id, idempotencyKey });
    return envelope(HttpStatus.OK, "Report export requested", data, req);
  }

  @Get("reports/:id/download")
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Download an export (base64 content, same envelope as finance CSV reports)",
  })
  async downloadReport(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.tenantScope(user, {});
    const file = await this.exports.download(id, scope, user.id);
    return envelope(
      HttpStatus.OK,
      "Report export downloaded successfully",
      { fileName: file.fileName, format: file.format, contentBase64: file.contentBase64 },
      req,
    );
  }

  private async tenantScope(
    user: AuthenticatedUser,
    query: AnalyticsRangeQueryDto,
  ): Promise<TenantScope> {
    const scope: TenantScope = {};
    if (user.role === UserRole.MERCHANT) {
      scope.merchantId = await this.merchantIdFor(user);
    } else if (query.merchantId && user.role === UserRole.ADMIN) {
      scope.merchantId = query.merchantId;
    }
    if (user.role === UserRole.HUB_MANAGER || (user.role === UserRole.ADMIN && query.hubId)) {
      scope.hubId = await this.hubScopeFor(user, query.hubId);
    }
    return scope;
  }
}
