import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CacheService } from "../common/cache/cache.service.js";
import { PayoutRequest } from "../database/entities";
import { ParcelStatus } from "@dhruto/contracts";
import {
  MerchantAnalyticsSummary,
  OperationalAnalyticsSummary,
  DailyTrendPoint,
  DistrictMetric,
  HubThroughputMetric,
  TopRiderMetric,
  RtoAnalytics,
  CodFlowAnalytics,
} from "@dhruto/contracts";
import { AnalyticsQueryDto } from "./dto/analytics.dto";
import { AnalyticsMetricsService, DELIVERED_STATUSES } from "./analytics-metrics.service.js";
import { AnalyticsDomainService } from "./analytics-domain.service.js";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import { RtoPrediction } from "../database/entities/RtoPrediction.entity.js";

/**
 * Legacy-shape analytics facade over the centralized metric layer.
 *
 * Same response contracts as before (merchant/operations dashboards keep
 * working), but every number now comes from real aggregate queries — the
 * hardcoded velocities, invented multipliers and synthetic trend filler are
 * gone. New Phase 7 endpoints live alongside these in the v2 controller
 * surface.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(RtoPrediction)
    private readonly predictionRepo: Repository<RtoPrediction>,
    private readonly metrics: AnalyticsMetricsService,
    private readonly domain: AnalyticsDomainService,
    private readonly ranges: AnalyticsRangeService,
    @Optional()
    private readonly cacheService?: CacheService,
  ) {}

  async getMerchantSummary(
    merchantId: string,
    query: AnalyticsQueryDto,
  ): Promise<MerchantAnalyticsSummary> {
    const cacheKey = `analytics:merchant:v2:${merchantId}:${query.period || "30d"}:${query.startDate || ""}:${query.endDate || ""}:${query.hubId || ""}`;
    if (this.cacheService) {
      return this.cacheService.wrap(
        cacheKey,
        () => this.computeMerchantSummary(merchantId, query),
        60,
      );
    }
    return this.computeMerchantSummary(merchantId, query);
  }

  private async computeMerchantSummary(
    merchantId: string,
    query: AnalyticsQueryDto,
  ): Promise<MerchantAnalyticsSummary> {
    const range = this.ranges.resolve({
      preset: (query.period as never) ?? "30d",
      from: query.startDate,
      to: query.endDate,
    });
    const scope = { merchantId };
    const counts = await this.metrics.statusCounts(scope, range);
    const eligible = this.metrics.eligible(
      counts.delivered,
      counts.rto,
      counts.failed,
      counts.cancelled,
    );
    const latencies = await this.metrics.deliveryLatencies(scope, range);
    const avgDeliveryHours =
      latencies.length > 0
        ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
        : 0;

    const cod = await this.domain.cod(scope, range);
    const feeRow = await this.metrics
      .scopedParcels(scope)
      .select("SUM(p.delivery_fee)", "sum")
      .andWhere('p."createdAt" BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawOne<{ sum: string | null }>();
    const payoutsRow = await this.payoutRepo
      .createQueryBuilder("pw")
      .select("SUM(pw.amount)", "sum")
      .where("pw.merchant_id = :merchantId", { merchantId })
      .andWhere("pw.status = :done", { done: "COMPLETED" })
      .andWhere('pw."createdAt" BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawOne<{ sum: string | null }>();

    const trends = await this.metrics.trends(scope, range);
    const dailyTrends: DailyTrendPoint[] = trends.map((t) => ({
      date: t.bucket,
      booked: t.booked,
      delivered: t.delivered,
      returned: t.returned,
      codCollected: t.codCollected,
    }));

    const districtRows = await this.metrics
      .scopedParcels(scope)
      .select("p.district", "district")
      .addSelect("COUNT(*)", "count")
      .addSelect(`SUM(CASE WHEN p.status IN (:...delivered) THEN 1 ELSE 0 END)`, "delivered")
      .andWhere('p."createdAt" BETWEEN :from AND :to', { from: range.from, to: range.to })
      .setParameters({ delivered: DELIVERED_STATUSES })
      .groupBy("p.district")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany<{ district: string | null; count: string; delivered: string }>();
    const total = counts.total;
    const topDistricts: DistrictMetric[] = districtRows.map((r) => ({
      district: r.district ?? "Unknown",
      orderCount: Number(r.count),
      percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
      successRate:
        Number(r.count) > 0 ? Math.round((Number(r.delivered) / Number(r.count)) * 1000) / 10 : 0,
    }));

    const pendingOrders =
      (counts.byStatus[ParcelStatus.CREATED] ?? 0) +
      (counts.byStatus[ParcelStatus.PICKUP_REQUESTED] ?? 0) +
      (counts.byStatus[ParcelStatus.PICKUP_ASSIGNED] ?? 0);

    return {
      period: query.period || "30d",
      startDate: range.from,
      endDate: range.to,
      kpis: {
        totalOrders: counts.total,
        deliveredOrders: counts.delivered,
        inTransitOrders: counts.inTransit,
        pendingOrders,
        returnedOrders: counts.rto,
        cancelledOrders: counts.cancelled,
        deliverySuccessRate: this.metrics.rate(counts.delivered, eligible) ?? 0,
        rtoRate: this.metrics.rate(counts.rto, eligible) ?? 0,
        avgDeliveryHours,
      },
      financials: {
        totalBookedCod: cod.booked,
        collectedCod: cod.collected,
        pendingCod: cod.pending,
        deliveryCharges: Number(feeRow?.sum ?? 0),
        netSettledPayouts: Number(payoutsRow?.sum ?? 0),
      },
      statusBreakdown: counts.byStatus,
      dailyTrends,
      topDistricts,
    };
  }

  async getOperationalSummary(query: AnalyticsQueryDto): Promise<OperationalAnalyticsSummary> {
    const cacheKey = `analytics:ops:v2:${query.period || "30d"}:${query.startDate || ""}:${query.endDate || ""}:${query.hubId || ""}`;
    if (this.cacheService) {
      return this.cacheService.wrap(cacheKey, () => this.computeOperationalSummary(query), 60);
    }
    return this.computeOperationalSummary(query);
  }

  private async computeOperationalSummary(
    query: AnalyticsQueryDto,
  ): Promise<OperationalAnalyticsSummary> {
    const range = this.ranges.resolve({
      preset: (query.period as never) ?? "30d",
      from: query.startDate,
      to: query.endDate,
    });
    const scope = query.hubId ? { hubId: query.hubId } : {};
    const counts = await this.metrics.statusCounts(scope, range);
    const eligible = this.metrics.eligible(
      counts.delivered,
      counts.rto,
      counts.failed,
      counts.cancelled,
    );

    const hubs = await this.metrics.hubStats(range, query.hubId);
    const hubThroughputList: HubThroughputMetric[] = hubs.map((h) => ({
      hubId: h.hubId,
      hubName: h.hubName,
      code: h.code,
      totalIncoming: h.incoming,
      totalSorted: h.incoming,
      totalDispatched: h.dispatched,
      inventoryCount: h.pending,
    }));

    const riders = await this.metrics.riderStats(range, query.hubId, 6);
    const topRiders: TopRiderMetric[] = riders.map((r) => ({
      riderId: r.riderId,
      name: r.name,
      phone: "",
      hubName: r.hubName,
      deliveredCount: r.delivered,
      completionRate: r.successRate ?? 0,
      cashCollected: r.codCollected,
    }));

    const rto = await this.getRtoAnalytics(query);
    const cod = await this.getCodAnalytics(query);
    const finance = await this.domain.finance(scope, range);
    const codDetail = await this.domain.cod(scope, range);

    return {
      period: query.period || "30d",
      totalShipments: counts.total,
      activeHubsCount: hubs.length,
      activeRidersCount: riders.filter((r) => r.assigned > 0).length,
      networkSuccessRate: this.metrics.rate(counts.delivered, eligible) ?? 0,
      networkRtoRate: this.metrics.rate(counts.rto, eligible) ?? 0,
      totalCodProcessed: finance.codCollectedMinor / 100,
      outstandingCashWithRiders: codDetail.pending,
      hubThroughputList,
      topRiders,
      rtoBreakdown: rto,
      codFlow: cod,
    };
  }

  async getHubThroughputAnalytics(query: AnalyticsQueryDto): Promise<HubThroughputMetric[]> {
    const summary = await this.getOperationalSummary(query);
    return summary.hubThroughputList;
  }

  async getRiderPerformanceAnalytics(query: AnalyticsQueryDto): Promise<TopRiderMetric[]> {
    const summary = await this.getOperationalSummary(query);
    return summary.topRiders;
  }

  async getRtoAnalytics(
    query: AnalyticsQueryDto,
    scope?: { merchantId?: string; hubId?: string },
  ): Promise<RtoAnalytics> {
    const range = this.ranges.resolve({
      preset: (query.period as never) ?? "30d",
      from: query.startDate,
      to: query.endDate,
    });
    const effectiveScope = scope ?? (query.hubId ? { hubId: query.hubId } : {});
    const rto = await this.domain.rto(effectiveScope, range);

    // Risk-tier correlation from real RTO prediction levels in range
    // (merchant-scoped when a tenant scope is provided).
    const predictionQb = this.predictionRepo
      .createQueryBuilder("p")
      .where('p."predicted_at" BETWEEN :from AND :to', { from: range.from, to: range.to });
    if (effectiveScope.merchantId) {
      predictionQb.andWhere("p.merchant_id = :merchantId", {
        merchantId: effectiveScope.merchantId,
      });
    }
    const predictions = await predictionQb.getMany();
    const tiers = ["HIGH", "MEDIUM", "LOW"] as const;
    const byRiskTier = tiers.map((tier) => {
      const group = predictions.filter((p) => p.level === tier);
      const labeled = group.filter((p) => p.outcome !== null);
      const rtoOutcomes = labeled.filter((p) => p.outcome === "RTO").length;
      return {
        tier,
        parcelCount: group.length,
        rtoRate: labeled.length > 0 ? Math.round((rtoOutcomes / labeled.length) * 1000) / 10 : 0,
      };
    });

    // Zone correlation via district success patterns is intentionally omitted:
    // zone attribution without a district→zone source would be invented data.
    // The v2 endpoint exposes byDistrict instead.
    return {
      overallRtoRate: rto.rtoRate.value ?? 0,
      topReasons: rto.byReason.slice(0, 5).map((r) => ({
        reason: r.reason,
        count: r.count,
        percentage: r.percentage,
      })),
      byZone: [],
      byRiskTier,
    };
  }

  async getCodAnalytics(
    query: AnalyticsQueryDto,
    scope?: { merchantId?: string; hubId?: string },
  ): Promise<CodFlowAnalytics> {
    const range = this.ranges.resolve({
      preset: (query.period as never) ?? "30d",
      from: query.startDate,
      to: query.endDate,
    });
    const effectiveScope = scope ?? (query.hubId ? { hubId: query.hubId } : {});
    const cod = await this.domain.cod(effectiveScope, range);
    const finance = await this.domain.finance(effectiveScope, range);
    return {
      totalBooked: cod.booked,
      inTransitWithRiders: cod.pending,
      collectedUnsettled: Math.max(0, cod.collected - finance.settledMinor / 100),
      settledToMerchants: finance.settledMinor / 100,
    };
  }
}
