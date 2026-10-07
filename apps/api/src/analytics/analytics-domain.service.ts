import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationChannel, NotificationStatus, WebhookDeliveryStatus, IntegrationFailureStatus } from "@dhruto/contracts";
import { DeliveryAttempt } from "../database/entities/DeliveryAttempt.entity.js";
import { CashLedger } from "../database/entities/CashLedger.entity.js";
import { Settlement } from "../database/entities/Settlement.entity.js";
import { PayoutRequest } from "../database/entities/PayoutRequest.entity.js";
import { Notification } from "../database/entities/Notification.entity.js";
import { WebhookDelivery } from "../database/entities/WebhookDelivery.entity.js";
import { IntegrationFailure } from "../database/entities/IntegrationFailure.entity.js";
import { AddressParse } from "../database/entities/AddressParse.entity.js";
import { AddressConfirmation } from "../database/entities/AddressConfirmation.entity.js";
import { RecipientRiskSnapshot } from "../database/entities/RecipientRiskSnapshot.entity.js";
import { RtoPrediction } from "../database/entities/RtoPrediction.entity.js";
import { IntelligenceRecommendation } from "../database/entities/IntelligenceRecommendation.entity.js";
import { Hub } from "../database/entities/Hub.entity.js";
import { Merchant } from "../database/entities/Merchant.entity.js";
import { AnalyticsMetricsService, DELIVERED_STATUSES, RTO_STATUSES, type TenantScope } from "./analytics-metrics.service.js";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import type { ResolvedRange } from "@dhruto/contracts";

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

/**
 * Domain analytics beyond parcels: RTO (from delivery_attempts, never stubbed
 * reasons), COD (from cash_ledgers + settlements), finance (read-only view of
 * the finance domain), notifications/webhooks (Phase 5 tables) and
 * intelligence (Phase 6 tables, incl. prediction quality with sample-size
 * guards).
 */
@Injectable()
export class AnalyticsDomainService {
  constructor(
    private readonly metrics: AnalyticsMetricsService,
    private readonly ranges: AnalyticsRangeService,
    @InjectRepository(DeliveryAttempt)
    private readonly attemptRepo: Repository<DeliveryAttempt>,
    @InjectRepository(CashLedger)
    private readonly ledgerRepo: Repository<CashLedger>,
    @InjectRepository(Settlement)
    private readonly settlementRepo: Repository<Settlement>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectRepository(IntegrationFailure)
    private readonly failureRepo: Repository<IntegrationFailure>,
    @InjectRepository(AddressParse)
    private readonly parseRepo: Repository<AddressParse>,
    @InjectRepository(AddressConfirmation)
    private readonly confirmationRepo: Repository<AddressConfirmation>,
    @InjectRepository(RecipientRiskSnapshot)
    private readonly riskRepo: Repository<RecipientRiskSnapshot>,
    @InjectRepository(RtoPrediction)
    private readonly predictionRepo: Repository<RtoPrediction>,
    @InjectRepository(IntelligenceRecommendation)
    private readonly recommendationRepo: Repository<IntelligenceRecommendation>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  /* ---------------- RTO ---------------- */

  async rto(scope: TenantScope, range: ResolvedRange): Promise<{
    rtoCount: number;
    rtoRate: { value: number | null; previous: number | null; changePct: number | null; trend: "up" | "down" | "flat"; noData: boolean };
    byReason: Array<{ reason: string; count: number; percentage: number }>;
    byDistrict: Array<{ district: string; count: number; rtoRate: number | null }>;
    byHub: Array<{ hubId: string; hubName: string; count: number }>;
    byMerchant: Array<{ merchantId: string; merchantName: string; count: number }>;
    overTime: Array<{ bucket: string; count: number; rate: number | null }>;
  }> {
    const counts = await this.metrics.statusCounts(scope, range);
    const eligible = this.metrics.eligible(counts.delivered, counts.rto, counts.failed, counts.cancelled);
    const prev = await this.metrics.statusCounts(scope, {
      ...range,
      from: range.previousFrom,
      to: range.previousTo,
    });
    const prevEligible = this.metrics.eligible(prev.delivered, prev.rto, prev.failed, prev.cancelled);
    const value = this.metrics.rate(counts.rto, eligible);
    const previous = this.metrics.rate(prev.rto, prevEligible);

    // Reasons from real attempt rows (raw enum kept; UI maps to labels).
    const reasonQb = this.attemptRepo
      .createQueryBuilder("a")
      .select("a.failure_reason", "reason")
      .addSelect("COUNT(*)", "count")
      .innerJoin("parcels", "p", "p.id = a.parcel_id")
      .where("a.outcome = :failed", { failed: "FAILED" })
      .andWhere('a.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere("a.failure_reason IS NOT NULL");
    if (scope.merchantId) {
      reasonQb.andWhere("p.merchant_id = :merchantId", { merchantId: scope.merchantId });
    }
    const reasonRows = await reasonQb
      .groupBy("a.failure_reason")
      .orderBy("count", "DESC")
      .getRawMany<{ reason: string; count: string }>();
    const reasonTotal = reasonRows.reduce((n, r) => n + Number(r.count), 0);
    const byReason = reasonRows.map((r) => ({
      reason: r.reason,
      count: Number(r.count),
      percentage: reasonTotal > 0 ? Math.round((Number(r.count) / reasonTotal) * 1000) / 10 : 0,
    }));

    // District / merchant breakdowns from RTO parcels.
    const rtoParcels = await this.metrics
      .scopedParcels(scope)
      .select("p.district", "district")
      .addSelect("p.merchant_id", "merchantId")
      .addSelect("p.current_hub_id", "hubId")
      .addSelect("COUNT(*)", "count")
      .addSelect("p.district", "d")
      .where("p.status IN (:...statuses)", { statuses: RTO_STATUSES })
      .andWhere('p.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy("p.district")
      .addGroupBy("p.merchant_id")
      .addGroupBy("p.current_hub_id")
      .getRawMany<{ district: string | null; merchantId: string; hubId: string | null; count: string }>();
    const byDistrictMap = new Map<string, number>();
    const byMerchantMap = new Map<string, number>();
    const byHubMap = new Map<string, number>();
    for (const row of rtoParcels) {
      byDistrictMap.set(row.district ?? "Unknown", (byDistrictMap.get(row.district ?? "Unknown") ?? 0) + Number(row.count));
      byMerchantMap.set(row.merchantId, (byMerchantMap.get(row.merchantId) ?? 0) + Number(row.count));
      if (row.hubId) byHubMap.set(row.hubId, (byHubMap.get(row.hubId) ?? 0) + Number(row.count));
    }
    const byDistrict = [...byDistrictMap.entries()]
      .map(([district, count]) => ({ district, count, rtoRate: null as number | null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const merchants = await this.merchantRepo.find();
    const merchantNames = new Map(merchants.map((m) => [m.id, m.businessName]));
    const byMerchant = [...byMerchantMap.entries()]
      .map(([merchantId, count]) => ({ merchantId, merchantName: merchantNames.get(merchantId) ?? "—", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const hubs = await this.hubRepo.find();
    const hubNames = new Map(hubs.map((h) => [h.id, h.name]));
    const byHub = [...byHubMap.entries()]
      .map(([hubId, count]) => ({ hubId, hubName: hubNames.get(hubId) ?? "—", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bucket = this.ranges.bucketSql("p.createdAt", range.granularity);
    const overTimeRows = await this.metrics
      .scopedParcels(scope)
      .select(`${bucket}`, "bucket")
      .addSelect(`SUM(CASE WHEN p.status IN (:...rto) THEN 1 ELSE 0 END)`, "rto")
      .addSelect(`SUM(CASE WHEN p.status IN (:...eligible) THEN 1 ELSE 0 END)`, "eligible")
      .andWhere('p.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .setParameters({ rto: RTO_STATUSES, eligible: [...DELIVERED_STATUSES, ...RTO_STATUSES] })
      .groupBy("bucket")
      .orderBy("bucket", "ASC")
      .getRawMany<{ bucket: Date; rto: string; eligible: string }>();
    const overTime = overTimeRows.map((r) => {
      const e = Number(r.eligible);
      return {
        bucket: new Date(r.bucket).toISOString().slice(0, 10),
        count: Number(r.rto),
        rate: e > 0 ? Math.round((Number(r.rto) / e) * 1000) / 10 : null,
      };
    });

    return {
      rtoCount: counts.rto,
      rtoRate: {
        value,
        previous,
        changePct: value !== null && previous !== null && previous !== 0
          ? Math.round(((value - previous) / previous) * 1000) / 10
          : null,
        trend: value === null || previous === null ? "flat" : value > previous ? "up" : value < previous ? "down" : "flat",
        noData: eligible === 0,
      },
      byReason,
      byDistrict,
      byHub,
      byMerchant,
      overTime,
    };
  }

  /* ---------------- COD ---------------- */

  async cod(scope: TenantScope, range: ResolvedRange): Promise<{
    booked: number; collected: number; pending: number; failed: number;
    collectionRate: number | null;
    overTime: Array<{ bucket: string; booked: number; collected: number }>;
  }> {
    const bookedRow = await this.metrics
      .scopedParcels(scope)
      .select("SUM(p.cod_amount)", "sum")
      .andWhere("p.cod_amount > 0")
      .andWhere('p.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawOne<{ sum: string | null }>();
    const collectedRow = await this.ledgerRepo
      .createQueryBuilder("l")
      .select("SUM(l.amount)", "sum")
      .innerJoin("parcels", "p", "p.id = l.parcel_id")
      .where('l.collectedAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere("l.hand_in_status IN (:...statuses)", { statuses: ["HANDED_IN", "VERIFIED"] })
      .andWhere(scope.merchantId ? "p.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    const pendingRow = await this.ledgerRepo
      .createQueryBuilder("l")
      .select("SUM(l.amount)", "sum")
      .innerJoin("parcels", "p", "p.id = l.parcel_id")
      .where("l.hand_in_status IN (:...statuses)", { statuses: ["PENDING", "HANDED_IN"] })
      .andWhere(scope.merchantId ? "p.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    const rtoParcels = await this.metrics
      .scopedParcels(scope)
      .select("SUM(p.cod_amount)", "sum")
      .andWhere("p.status IN (:...statuses)", { statuses: RTO_STATUSES })
      .andWhere('p.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawOne<{ sum: string | null }>();
    const collected = num(collectedRow?.sum);
    const failed = num(rtoParcels?.sum);

    const bucket = this.ranges.bucketSql("p.createdAt", range.granularity);
    const overTimeRows = await this.metrics
      .scopedParcels(scope)
      .select(`${bucket}`, "bucket")
      .addSelect("SUM(p.cod_amount)", "booked")
      .addSelect(`SUM(CASE WHEN p.status IN (:...delivered) THEN p.cod_amount ELSE 0 END)`, "collected")
      .andWhere('p.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .setParameters({ delivered: DELIVERED_STATUSES })
      .groupBy("bucket")
      .orderBy("bucket", "ASC")
      .getRawMany<{ bucket: Date; booked: string | null; collected: string | null }>();

    return {
      booked: num(bookedRow?.sum),
      collected,
      pending: num(pendingRow?.sum),
      failed,
      collectionRate: collected + failed > 0 ? Math.round((collected / (collected + failed)) * 1000) / 10 : null,
      overTime: overTimeRows.map((r) => ({
        bucket: new Date(r.bucket).toISOString().slice(0, 10),
        booked: num(r.booked),
        collected: num(r.collected),
      })),
    };
  }

  /* ---------------- finance (read-only) ---------------- */

  async finance(scope: TenantScope, range: ResolvedRange): Promise<{
    pendingSettlementMinor: number; settledMinor: number;
    payoutRequestedMinor: number; payoutCompletedMinor: number;
    codCollectedMinor: number; sourceNote: string;
  }> {
    const settledRow = await this.settlementRepo
      .createQueryBuilder("s")
      .select("SUM(s.net_minor)", "sum")
      .where("s.status = :status", { status: "SETTLED" })
      .andWhere('s."settled_at" BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere(scope.merchantId ? "s.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    // Pending = gross of VERIFIED ledgers with no settlement row (documented formula).
    const pendingRow = await this.ledgerRepo
      .createQueryBuilder("l")
      .select("SUM(l.amount)", "sum")
      .leftJoin("settlements", "s", "s.cash_ledger_id = l.id")
      .innerJoin("parcels", "p", "p.id = l.parcel_id")
      .where("l.hand_in_status = :verified", { verified: "VERIFIED" })
      .andWhere("s.id IS NULL")
      .andWhere(scope.merchantId ? "p.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    const payoutReqRow = await this.payoutRepo
      .createQueryBuilder("pw")
      .select("SUM(pw.amount)", "sum")
      .where('pw.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere("pw.status IN (:...statuses)", { statuses: ["REQUESTED", "APPROVED", "PROCESSING"] })
      .andWhere(scope.merchantId ? "pw.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    const payoutDoneRow = await this.payoutRepo
      .createQueryBuilder("pw")
      .select("SUM(pw.amount)", "sum")
      .where('pw.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere("pw.status = :done", { done: "COMPLETED" })
      .andWhere(scope.merchantId ? "pw.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    const codRow = await this.ledgerRepo
      .createQueryBuilder("l")
      .select("SUM(l.amount)", "sum")
      .innerJoin("parcels", "p", "p.id = l.parcel_id")
      .where('l.collectedAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere(scope.merchantId ? "p.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .getRawOne<{ sum: string | null }>();
    return {
      pendingSettlementMinor: Math.round(num(pendingRow?.sum) * 100),
      settledMinor: Number(settledRow?.sum ?? 0),
      payoutRequestedMinor: Math.round(num(payoutReqRow?.sum) * 100),
      payoutCompletedMinor: Math.round(num(payoutDoneRow?.sum) * 100),
      codCollectedMinor: Math.round(num(codRow?.sum) * 100),
      sourceNote: "Read-only view. Finance domain (wallets, ledger, settlements) is the source of truth; discrepancies are flagged, never repaired here.",
    };
  }

  /* ---------------- notifications + webhooks ---------------- */

  async notifications(scope: TenantScope, range: ResolvedRange): Promise<{
    byChannel: Array<{ channel: string; sent: number; failed: number; deliveryRate: number | null }>;
    retries: number; deadLetter: number; failureRate: number | null;
  }> {
    const qb = this.notificationRepo
      .createQueryBuilder("n")
      .select("n.channel", "channel")
      .addSelect("SUM(CASE WHEN n.status IN (:...sent) THEN 1 ELSE 0 END)", "sent")
      .addSelect("SUM(CASE WHEN n.status = :failed THEN 1 ELSE 0 END)", "failed")
      .addSelect("SUM(CASE WHEN n.attempt_count > 1 THEN 1 ELSE 0 END)", "retries")
      .andWhere('n.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .setParameters({ sent: [NotificationStatus.SENT, NotificationStatus.READ], failed: NotificationStatus.FAILED });
    if (scope.merchantId) {
      qb.andWhere("n.merchant_id = :merchantId", { merchantId: scope.merchantId });
    }
    const rows = await qb
      .groupBy("n.channel")
      .getRawMany<{ channel: string; sent: string; failed: string; retries: string }>();
    let totalRetries = 0;
    const byChannel = (Object.values(NotificationChannel) as string[]).map((channel) => {
      const row = rows.find((r) => r.channel === channel);
      const sent = row ? Number(row.sent) : 0;
      const failed = row ? Number(row.failed) : 0;
      totalRetries += row ? Number(row.retries) : 0;
      return {
        channel,
        sent,
        failed,
        deliveryRate: sent + failed > 0 ? Math.round((sent / (sent + failed)) * 1000) / 10 : null,
      };
    });
    const deadLetter = await this.failureRepo.count({
      where: { status: IntegrationFailureStatus.OPEN },
    });
    const totalSent = byChannel.reduce((n, c) => n + c.sent, 0);
    const totalFailed = byChannel.reduce((n, c) => n + c.failed, 0);
    return {
      byChannel,
      retries: totalRetries,
      deadLetter,
      failureRate: totalSent + totalFailed > 0 ? Math.round((totalFailed / (totalSent + totalFailed)) * 1000) / 10 : null,
    };
  }

  async webhooks(scope: TenantScope, range: ResolvedRange): Promise<{
    total: number; delivered: number; failed4xx: number; failed5xx: number;
    pending: number; deadLetter: number; successRate: number | null;
  }> {
    const qb = this.deliveryRepo
      .createQueryBuilder("d")
      .andWhere('d.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to });
    if (scope.merchantId) qb.andWhere("d.merchant_id = :merchantId", { merchantId: scope.merchantId });
    const rows = await qb
      .select("d.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("d.status")
      .getRawMany<{ status: string; count: string }>();
    const get = (s: string): number => Number(rows.find((r) => r.status === s)?.count ?? 0);
    const delivered = get(WebhookDeliveryStatus.DELIVERED);
    // 4xx vs 5xx split from status codes on FAILED rows.
    const failedRows = await this.deliveryRepo
      .createQueryBuilder("d")
      .select("d.status_code", "code")
      .addSelect("COUNT(*)", "count")
      .andWhere("d.status IN (:...statuses)", { statuses: [WebhookDeliveryStatus.FAILED, WebhookDeliveryStatus.DEAD_LETTER] })
      .andWhere('d.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .andWhere(scope.merchantId ? "d.merchant_id = :merchantId" : "1=1", { merchantId: scope.merchantId ?? "" })
      .groupBy("d.status_code")
      .getRawMany<{ code: number | null; count: string }>();
    let failed4xx = 0;
    let failed5xx = 0;
    for (const row of failedRows) {
      if (row.code !== null && row.code >= 400 && row.code < 500) failed4xx += Number(row.count);
      else failed5xx += Number(row.count);
    }
    const pending = get(WebhookDeliveryStatus.PENDING) + get(WebhookDeliveryStatus.FAILED);
    const deadLetter = get(WebhookDeliveryStatus.DEAD_LETTER);
    const total = delivered + pending + deadLetter;
    return {
      total,
      delivered,
      failed4xx,
      failed5xx,
      pending,
      deadLetter,
      successRate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : null,
    };
  }

  /* ---------------- intelligence ---------------- */

  async intelligence(range: ResolvedRange): Promise<{
    address: { parses: number; highConfidence: number; lowConfidence: number; confirmations: number };
    risk: { snapshots: number; high: number; unknownShare: number | null; overrides: number };
    rto: { predictions: number; outcomes: number; correct: number; precision: number | null; recall: number | null; insufficientData: boolean };
    byModelVersion: Array<{ modelVersion: string; predictions: number; outcomes: number; precision: number | null }>;
  }> {
    const between = '"createdAt" BETWEEN :from AND :to';
    const params = { from: range.from, to: range.to };
    const parses = await this.parseRepo.createQueryBuilder("p").where(between, params).getCount();
    const highConfidence = await this.parseRepo
      .createQueryBuilder("p")
      .where(between, params)
      .andWhere("p.confidence >= :t", { t: 0.75 })
      .getCount();
    const lowConfidence = await this.parseRepo
      .createQueryBuilder("p")
      .where(between, params)
      .andWhere("p.confidence < :t", { t: 0.5 })
      .getCount();
    const confirmations = await this.confirmationRepo.createQueryBuilder("c").where(between, params).getCount();

    const snapshots = await this.riskRepo.createQueryBuilder("r").where(between, params).getCount();
    const high = await this.riskRepo
      .createQueryBuilder("r")
      .where(between, params)
      .andWhere("r.level = :level", { level: "HIGH" })
      .getCount();
    const unknown = await this.riskRepo
      .createQueryBuilder("r")
      .where(between, params)
      .andWhere("r.level = :level", { level: "UNKNOWN" })
      .getCount();
    const overrides = await this.recommendationRepo
      .createQueryBuilder("rec")
      .where(between, params)
      .andWhere("rec.status = :status", { status: "OVERRIDDEN" })
      .getCount();

    const predictions = await this.predictionRepo.find();
    const inRange = predictions.filter(
      (p) => p.predictedAt >= new Date(range.from) && p.predictedAt <= new Date(range.to),
    );
    const labeled = inRange.filter((p) => p.outcome !== null);
    const isCorrect = (p: (typeof inRange)[number]): boolean =>
      ((p.level === "HIGH" || p.level === "MEDIUM") && p.outcome === "RTO") ||
      (p.level === "LOW" && p.outcome === "DELIVERED");
    const correct = labeled.filter(isCorrect).length;
    const flagged = labeled.filter((p) => p.level === "HIGH" || p.level === "MEDIUM").length;
    const actualRto = labeled.filter((p) => p.outcome === "RTO").length;
    const insufficientData = labeled.length < 10;
    const byVersion = new Map<string, { predictions: number; outcomes: number; correct: number }>();
    for (const p of inRange) {
      const entry = byVersion.get(p.modelVersion) ?? { predictions: 0, outcomes: 0, correct: 0 };
      entry.predictions++;
      if (p.outcome !== null) {
        entry.outcomes++;
        if (isCorrect(p)) entry.correct++;
      }
      byVersion.set(p.modelVersion, entry);
    }

    return {
      address: { parses, highConfidence, lowConfidence, confirmations },
      risk: {
        snapshots,
        high,
        unknownShare: snapshots > 0 ? Math.round((unknown / snapshots) * 1000) / 10 : null,
        overrides,
      },
      rto: {
        predictions: inRange.length,
        outcomes: labeled.length,
        correct,
        precision: insufficientData || flagged === 0 ? null : Math.round((labeled.filter((p) => (p.level === "HIGH" || p.level === "MEDIUM") && isCorrect(p)).length / flagged) * 1000) / 10,
        recall: insufficientData || actualRto === 0 ? null : Math.round((labeled.filter((p) => p.outcome === "RTO" && isCorrect(p)).length / actualRto) * 1000) / 10,
        insufficientData,
      },
      byModelVersion: [...byVersion.entries()].map(([modelVersion, v]) => ({
        modelVersion,
        predictions: v.predictions,
        outcomes: v.outcomes,
        precision: v.outcomes < 10 ? null : Math.round((v.correct / v.outcomes) * 1000) / 10,
      })),
    };
  }
}
