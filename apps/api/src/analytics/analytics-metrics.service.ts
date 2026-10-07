import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ParcelStatus } from "@dhruto/contracts";
import { Parcel } from "../database/entities/Parcel.entity.js";
import { ParcelStatusHistory } from "../database/entities/ParcelStatusHistory.entity.js";
import { DeliveryAttempt } from "../database/entities/DeliveryAttempt.entity.js";
import { CashLedger } from "../database/entities/CashLedger.entity.js";
import { Rider } from "../database/entities/Rider.entity.js";
import { Hub } from "../database/entities/Hub.entity.js";
import { Merchant } from "../database/entities/Merchant.entity.js";
import { ParcelScan } from "../database/entities/ParcelScan.entity.js";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import type { ResolvedRange } from "@dhruto/contracts";

export const DELIVERED_STATUSES: ParcelStatus[] = [
  ParcelStatus.DELIVERED,
  ParcelStatus.CASH_PENDING,
  ParcelStatus.CASH_VERIFIED,
];

export const RTO_STATUSES: ParcelStatus[] = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
];

export const FAILED_ATTEMPT_STATUSES: ParcelStatus[] = [
  ParcelStatus.DELIVERY_ATTEMPTED,
  ParcelStatus.RESCHEDULED,
];

export const TERMINAL_FAILURE_STATUSES: ParcelStatus[] = [
  ParcelStatus.CANCELLED,
  ParcelStatus.LOST,
  ParcelStatus.DAMAGED,
];

export interface TenantScope {
  merchantId?: string;
  hubId?: string;
  riderId?: string;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

/**
 * Centralized metric calculations — the single source of truth.
 *
 * Every KPI here is computed with aggregate GROUP BY queries scoped by tenant
 * at the query layer (never fetch-then-filter). Durations come from
 * ParcelStatusHistory timestamps, never `updatedAt`. Rates return null when
 * there are no eligible records (no-data), never a misleading 0%.
 */
@Injectable()
export class AnalyticsMetricsService {
  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly historyRepo: Repository<ParcelStatusHistory>,
    @InjectRepository(DeliveryAttempt)
    private readonly attemptRepo: Repository<DeliveryAttempt>,
    @InjectRepository(CashLedger)
    private readonly ledgerRepo: Repository<CashLedger>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(ParcelScan)
    private readonly scanRepo: Repository<ParcelScan>,
    private readonly ranges: AnalyticsRangeService,
  ) {}

  scopedParcels(scope: TenantScope): ReturnType<Repository<Parcel>["createQueryBuilder"]> {
    const qb = this.parcelRepo.createQueryBuilder("p");
    if (scope.merchantId)
      qb.andWhere("p.merchant_id = :merchantId", { merchantId: scope.merchantId });
    if (scope.hubId) qb.andWhere("p.current_hub_id = :hubId", { hubId: scope.hubId });
    if (scope.riderId) qb.andWhere("p.current_rider_id = :riderId", { riderId: scope.riderId });
    return qb;
  }

  inRange(
    qb: { andWhere: (...args: never[]) => unknown },
    alias: string,
    range: ResolvedRange,
  ): void {
    (qb.andWhere as (cond: string, params: object) => void)(
      `${alias}."createdAt" BETWEEN :from AND :to`,
      { from: range.from, to: range.to },
    );
  }

  /* ---------------- status cohorts ---------------- */

  async statusCounts(
    scope: TenantScope,
    range: ResolvedRange,
  ): Promise<{
    total: number;
    delivered: number;
    rto: number;
    failed: number;
    cancelled: number;
    inTransit: number;
    byStatus: Record<string, number>;
  }> {
    const rows = await this.scopedParcels(scope)
      .select("p.status", "status")
      .addSelect("COUNT(*)", "count")
      .andWhere("p.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
      .groupBy("p.status")
      .getRawMany<{ status: ParcelStatus; count: string }>();
    const byStatus: Record<string, number> = {};
    for (const row of rows) byStatus[row.status] = Number(row.count);
    const sum = (statuses: ParcelStatus[]): number =>
      statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0);
    const delivered = sum(DELIVERED_STATUSES);
    const rto = sum(RTO_STATUSES);
    const failed = sum(FAILED_ATTEMPT_STATUSES);
    const cancelled = sum(TERMINAL_FAILURE_STATUSES);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return {
      total,
      delivered,
      rto,
      failed,
      cancelled,
      inTransit: total - delivered - rto - failed - cancelled,
      byStatus,
    };
  }

  eligible(delivered: number, rto: number, failed: number, cancelled: number): number {
    return delivered + rto + failed + cancelled;
  }

  rate(numerator: number, eligible: number): number | null {
    if (eligible <= 0) return null;
    return Math.round((numerator / eligible) * 1000) / 10;
  }

  /* ---------------- delivery latency from history ---------------- */

  /** CREATED → first DELIVERED-toStatus hours per parcel (cohort in range). */
  async deliveryLatencies(
    scope: TenantScope,
    range: ResolvedRange,
    limit = 20000,
  ): Promise<number[]> {
    const parcels = await this.scopedParcels(scope)
      .select("p.id", "id")
      .addSelect("p.createdAt", "createdAt")
      .andWhere("p.status IN (:...statuses)", { statuses: DELIVERED_STATUSES })
      .andWhere("p.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
      .limit(limit)
      .getRawMany<{ id: string; createdAt: Date }>();
    if (parcels.length === 0) return [];
    const ids = parcels.map((p) => p.id);
    const createdById = new Map(parcels.map((p) => [p.id, new Date(p.createdAt).getTime()]));
    const deliveredRows = await this.historyRepo
      .createQueryBuilder("h")
      .select("h.parcel_id", "parcelId")
      .addSelect("MIN(h.createdAt)", "deliveredAt")
      .where("h.parcel_id IN (:...ids)", { ids })
      .andWhere("h.toStatus = :delivered", { delivered: ParcelStatus.DELIVERED })
      .groupBy("h.parcel_id")
      .getRawMany<{ parcelId: string; deliveredAt: Date }>();
    const hours: number[] = [];
    for (const row of deliveredRows) {
      const created = createdById.get(row.parcelId);
      if (created === undefined) continue;
      const diff = (new Date(row.deliveredAt).getTime() - created) / 3600000;
      if (diff >= 0 && diff < 24 * 60) hours.push(diff);
    }
    return hours.sort((a, b) => a - b);
  }

  percentile(sorted: number[], p: number): number | null {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    const v = sorted[Math.max(0, idx)];
    return v === undefined ? null : Math.round(v * 10) / 10;
  }

  /* ---------------- trends (Dhaka-day buckets) ---------------- */

  async trends(
    scope: TenantScope,
    range: ResolvedRange,
  ): Promise<
    Array<{
      bucket: string;
      booked: number;
      delivered: number;
      returned: number;
      codCollected: number;
    }>
  > {
    const bucket = this.ranges.bucketSql("p.createdAt", range.granularity);
    const rows = await this.scopedParcels(scope)
      .select(`${bucket}`, "bucket")
      .addSelect("COUNT(*)", "booked")
      .addSelect(`SUM(CASE WHEN p.status IN (:...delivered) THEN 1 ELSE 0 END)`, "delivered")
      .addSelect(`SUM(CASE WHEN p.status IN (:...rto) THEN 1 ELSE 0 END)`, "returned")
      .addSelect(`SUM(CASE WHEN p.status IN (:...delivered) THEN p.cod_amount ELSE 0 END)`, "cod")
      .andWhere("p.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
      .setParameters({ delivered: DELIVERED_STATUSES, rto: RTO_STATUSES })
      .groupBy("bucket")
      .orderBy("bucket", "ASC")
      .getRawMany<{
        bucket: Date;
        booked: string;
        delivered: string;
        returned: string;
        cod: string;
      }>();
    return rows.map((r) => ({
      bucket: new Date(r.bucket).toISOString().slice(0, range.granularity === "hour" ? 13 : 10),
      booked: Number(r.booked),
      delivered: Number(r.delivered),
      returned: Number(r.returned),
      codCollected: num(r.cod),
    }));
  }

  /* ---------------- funnel from status history ---------------- */

  async funnel(
    scope: TenantScope,
    range: ResolvedRange,
  ): Promise<Array<{ stage: string; count: number }>> {
    const stages: Array<{ status: ParcelStatus; label: string }> = [
      { status: ParcelStatus.CREATED, label: "Created" },
      { status: ParcelStatus.PICKED_UP, label: "Picked Up" },
      { status: ParcelStatus.ORIGIN_HUB_RECEIVED, label: "Origin Hub" },
      { status: ParcelStatus.IN_TRANSIT, label: "In Transit" },
      { status: ParcelStatus.DESTINATION_HUB_RECEIVED, label: "Destination Hub" },
      { status: ParcelStatus.OUT_FOR_DELIVERY, label: "Out for Delivery" },
      { status: ParcelStatus.DELIVERED, label: "Delivered" },
    ];
    const parcelIds = await this.scopedParcels(scope)
      .select("p.id", "id")
      .andWhere("p.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
      .getRawMany<{ id: string }>();
    const ids = parcelIds.map((p) => p.id);
    if (ids.length === 0) return stages.map((s) => ({ stage: s.label, count: 0 }));
    const rows = await this.historyRepo
      .createQueryBuilder("h")
      .select("h.toStatus", "status")
      .addSelect("COUNT(DISTINCT h.parcel_id)", "count")
      .where("h.parcel_id IN (:...ids)", { ids })
      .andWhere("h.toStatus IN (:...statuses)", { statuses: stages.map((s) => s.status) })
      .groupBy("h.toStatus")
      .getRawMany<{ status: ParcelStatus; count: string }>();
    const byStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));
    // Created stage = cohort size (histories may predate range for old parcels).
    const created = ids.length;
    return stages.map((s) =>
      s.status === ParcelStatus.CREATED
        ? { stage: s.label, count: created }
        : { stage: s.label, count: byStatus.get(s.status) ?? 0 },
    );
  }

  /* ---------------- hubs ---------------- */

  async hubStats(
    range: ResolvedRange,
    hubId?: string,
  ): Promise<
    Array<{
      hubId: string;
      hubName: string;
      code: string;
      incoming: number;
      dispatched: number;
      pending: number;
      throughputPerDay: number;
      backlog: Array<{ bucket: string; count: number; oldestHours: number | null }>;
      oldestPendingHours: number | null;
    }>
  > {
    const hubs = hubId
      ? await this.hubRepo.find({ where: { id: hubId } })
      : await this.hubRepo.find({ take: 100 });
    const days = Math.max(
      1,
      (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000,
    );
    const out: Awaited<ReturnType<AnalyticsMetricsService["hubStats"]>> = [];
    for (const hub of hubs) {
      const incomingInRange = await this.scanRepo
        .createQueryBuilder("s")
        .where("s.hub_id = :hubId", { hubId: hub.id })
        .andWhere("s.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
        .andWhere("s.scan_type IN (:...receive)", {
          receive: ["RECEIVE_INBOUND", "RECEIVE_TRANSFER"],
        })
        .getCount();
      const dispatchedInRange = await this.scanRepo
        .createQueryBuilder("s")
        .where("s.hub_id = :hubId", { hubId: hub.id })
        .andWhere("s.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
        .andWhere("s.scan_type = :dispatch", { dispatch: "DISPATCH_BAG" })
        .getCount();
      const pendingParcels = await this.parcelRepo
        .createQueryBuilder("p")
        .select("p.id", "id")
        .addSelect("p.createdAt", "createdAt")
        .addSelect("MAX(h.createdAt)", "lastEvent")
        .leftJoin(ParcelStatusHistory, "h", "h.parcel_id = p.id")
        .where("p.current_hub_id = :hubId", { hubId: hub.id })
        .andWhere("p.status NOT IN (:...terminal)", {
          terminal: [...DELIVERED_STATUSES, ...RTO_STATUSES, ...TERMINAL_FAILURE_STATUSES],
        })
        .groupBy("p.id")
        .addGroupBy("p.createdAt")
        .getRawMany<{ id: string; createdAt: Date; lastEvent: Date | null }>();
      const now = Date.now();
      const ages = pendingParcels.map(
        (p) => (now - new Date(p.lastEvent ?? p.createdAt).getTime()) / 3600000,
      );
      const buckets = ["<6h", "6-12h", "12-24h", "1-2d", "2d+"].map((bucket) => ({
        bucket,
        count: 0,
        oldestHours: null as number | null,
      }));
      for (const age of ages) {
        const idx = age < 6 ? 0 : age < 12 ? 1 : age < 24 ? 2 : age < 48 ? 3 : 4;
        const b = buckets[idx];
        if (b) {
          b.count++;
          b.oldestHours =
            b.oldestHours === null
              ? Math.round(age * 10) / 10
              : Math.max(b.oldestHours, Math.round(age * 10) / 10);
        }
      }
      out.push({
        hubId: hub.id,
        hubName: hub.name,
        code: hub.code,
        incoming: incomingInRange,
        dispatched: dispatchedInRange,
        pending: pendingParcels.length,
        throughputPerDay: Math.round((incomingInRange / days) * 10) / 10,
        backlog: buckets,
        oldestPendingHours: ages.length > 0 ? Math.round(Math.max(...ages) * 10) / 10 : null,
      });
    }
    return out;
  }

  /* ---------------- riders ---------------- */

  async riderStats(
    range: ResolvedRange,
    hubId?: string,
    limit = 50,
  ): Promise<
    Array<{
      riderId: string;
      name: string;
      hubName: string;
      assigned: number;
      delivered: number;
      failed: number;
      successRate: number | null;
      firstAttemptSuccess: number | null;
      avgCompletionHours: number | null;
      codCollected: number;
    }>
  > {
    const riders = await this.riderRepo.find({
      where: hubId ? { hubId } : {},
      relations: ["user", "hub"],
      take: limit,
    });
    const out: Awaited<ReturnType<AnalyticsMetricsService["riderStats"]>> = [];
    for (const rider of riders) {
      const attempts = await this.attemptRepo
        .createQueryBuilder("a")
        .where("a.rider_id = :riderId", { riderId: rider.id })
        .andWhere("a.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
        .orderBy("a.createdAt", "ASC")
        .getMany();
      const parcelIds = [...new Set(attempts.map((a) => a.parcelId))];
      const deliveredAttempts = attempts.filter((a) => a.outcome === "DELIVERED").length;
      const failedAttempts = attempts.filter((a) => a.outcome === "FAILED").length;
      const firsts = new Map<string, (typeof attempts)[number]>();
      for (const a of attempts) {
        if (!firsts.has(a.parcelId)) firsts.set(a.parcelId, a);
      }
      const firstDelivered = [...firsts.values()].filter((a) => a.outcome === "DELIVERED").length;
      // Completion hours: first attempt → delivered attempt per parcel.
      const lastDelivered = new Map<string, Date>();
      for (const a of attempts) {
        if (a.outcome === "DELIVERED") lastDelivered.set(a.parcelId, a.createdAt);
      }
      const durations: number[] = [];
      for (const [parcelId, first] of firsts) {
        const last = lastDelivered.get(parcelId);
        if (last) {
          const h = (new Date(last).getTime() - new Date(first.createdAt).getTime()) / 3600000;
          if (h >= 0 && h < 24 * 30) durations.push(h);
        }
      }
      let codCollected = 0;
      if (parcelIds.length > 0) {
        const ledgers = await this.ledgerRepo
          .createQueryBuilder("l")
          .select("SUM(l.amount)", "sum")
          .where("l.rider_id = :riderId", { riderId: rider.id })
          .andWhere("l.collectedAt BETWEEN :from AND :to", { from: range.from, to: range.to })
          .getRawOne<{ sum: string | null }>();
        codCollected = num(ledgers?.sum);
      }
      out.push({
        riderId: rider.id,
        name: rider.user?.name ?? "Rider",
        hubName: rider.hub?.name ?? "—",
        assigned: parcelIds.length,
        delivered: deliveredAttempts,
        failed: failedAttempts,
        successRate:
          attempts.length > 0
            ? Math.round((deliveredAttempts / attempts.length) * 1000) / 10
            : null,
        firstAttemptSuccess:
          firsts.size > 0 ? Math.round((firstDelivered / firsts.size) * 1000) / 10 : null,
        avgCompletionHours:
          durations.length > 0
            ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
            : null,
        codCollected,
      });
    }
    return out.sort((a, b) => b.delivered - a.delivered);
  }

  /* ---------------- merchants compare (admin) ---------------- */

  async merchantCompare(
    range: ResolvedRange,
    limit = 100,
  ): Promise<
    Array<{
      merchantId: string;
      merchantName: string;
      parcels: number;
      delivered: number;
      successRate: number | null;
      rtoRate: number | null;
      codVolume: number;
      avgDeliveryHours: number | null;
    }>
  > {
    const merchants = await this.merchantRepo.find({ take: limit });
    const out: Awaited<ReturnType<AnalyticsMetricsService["merchantCompare"]>> = [];
    for (const merchant of merchants) {
      const scope = { merchantId: merchant.id };
      const counts = await this.statusCounts(scope, range);
      const eligible = this.eligible(counts.delivered, counts.rto, counts.failed, counts.cancelled);
      const codRow = await this.scopedParcels(scope)
        .select("SUM(p.cod_amount)", "sum")
        .andWhere("p.createdAt BETWEEN :from AND :to", { from: range.from, to: range.to })
        .getRawOne<{ sum: string | null }>();
      const latencies = await this.deliveryLatencies(scope, range, 2000);
      out.push({
        merchantId: merchant.id,
        merchantName: merchant.businessName,
        parcels: counts.total,
        delivered: counts.delivered,
        successRate: this.rate(counts.delivered, eligible),
        rtoRate: this.rate(counts.rto, eligible),
        codVolume: num(codRow?.sum),
        avgDeliveryHours:
          latencies.length > 0
            ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
            : null,
      });
    }
    return out.sort((a, b) => b.parcels - a.parcels);
  }
}
