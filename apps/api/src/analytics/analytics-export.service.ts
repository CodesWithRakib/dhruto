import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository, MoreThan } from "typeorm";
import * as XLSX from "xlsx";
import {
  ApiErrorCode,
  type ExportDataset,
  type ExportFormat,
  type ExportRequest,
  type ReportExport as ReportExportContract,
} from "@dhruto/contracts";
import { ReportExport } from "../database/entities/ReportExport.entity.js";
import { AnalyticsMetricsService, type TenantScope } from "./analytics-metrics.service.js";
import { AnalyticsDomainService } from "./analytics-domain.service.js";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";
import { getErrorMessage } from "../common/utils/error.util.js";

const SYNC_ROW_CAP = 5000;
const MAX_ROWS = 50000;
const EXPORT_TTL_HOURS = 72;

function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const escape = (v: string | number | null): string => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

function toXlsxBase64(headers: string[], rows: Array<Array<string | number | null>>): string {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "report");
  return XLSX.write(book, { type: "base64", bookType: "xlsx" });
}

/**
 * Report exports with filter snapshots for reproducibility.
 *
 * Small datasets generate synchronously (≤5k rows). Larger ones queue a
 * BullMQ job (idempotent per idempotency key) and notify the requester
 * in-app on completion. Content lives server-side, expires in 72h, and
 * enforces the same tenant scope as the read APIs.
 */
@Injectable()
export class AnalyticsExportService {
  private readonly logger = new Logger(AnalyticsExportService.name);

  constructor(
    @InjectRepository(ReportExport)
    private readonly exportRepo: Repository<ReportExport>,
    private readonly metrics: AnalyticsMetricsService,
    private readonly domain: AnalyticsDomainService,
    private readonly ranges: AnalyticsRangeService,
    @Optional() @InjectQueue("analytics-exports") private readonly exportsQueue?: Queue,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async request(
    input: ExportRequest,
    scope: TenantScope,
    actor: { id: string; idempotencyKey?: string },
  ): Promise<ReportExportContract> {
    if (actor.idempotencyKey) {
      const existing = await this.exportRepo.findOne({
        where: { idempotencyKey: actor.idempotencyKey },
      });
      if (existing) return this.toContract(existing);
    }
    const filters: Record<string, unknown> = {
      dataset: input.dataset,
      format: input.format,
      preset: input.preset,
      from: input.from ?? null,
      to: input.to ?? null,
      merchantId: scope.merchantId ?? null,
      hubId: scope.hubId ?? null,
      riderId: scope.riderId ?? null,
    };
    const row = await this.exportRepo.save(
      this.exportRepo.create({
        dataset: input.dataset,
        format: input.format,
        status: "PENDING",
        idempotencyKey: actor.idempotencyKey ?? null,
        filters,
        tenantId: scope.merchantId ?? scope.hubId ?? scope.riderId ?? null,
        requestedBy: actor.id,
        expiresAt: new Date(Date.now() + EXPORT_TTL_HOURS * 3600 * 1000),
      }),
    );

    // Estimate size; small exports complete inline, large ones queue.
    const { headers, rows } = await this.buildDataset(input.dataset, scope, input);
    if (rows.length <= SYNC_ROW_CAP) {
      await this.complete(row.id, headers, rows, input.format);
    } else if (this.exportsQueue) {
      try {
        await this.exportsQueue.add(
          "export-generate",
          { exportId: row.id },
          {
            jobId: `export-${row.id}`,
            attempts: 3,
            backoff: { type: "exponential", delay: 10000 },
            removeOnComplete: 500,
            removeOnFail: 1000,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Export queue unavailable, completing inline: ${getErrorMessage(error, "unknown")}`,
        );
        await this.complete(row.id, headers, rows, input.format);
      }
    } else {
      await this.complete(row.id, headers, rows, input.format);
    }
    const fresh = await this.exportRepo.findOne({ where: { id: row.id } });
    return this.toContract(fresh ?? row);
  }

  /** Worker entry: regenerates the dataset and completes the export. */
  async generateQueued(exportId: string): Promise<void> {
    const row = await this.exportRepo.findOne({ where: { id: exportId } });
    if (!row || row.status === "READY") return; // idempotent
    try {
      const filters = row.filters;
      const scope: TenantScope = {
        merchantId: (filters.merchantId as string) || undefined,
        hubId: (filters.hubId as string) || undefined,
        riderId: (filters.riderId as string) || undefined,
      };
      const { headers, rows } = await this.buildDataset(row.dataset as ExportDataset, scope, {
        dataset: row.dataset as ExportDataset,
        format: row.format as ExportFormat,
      });
      await this.complete(row.id, headers, rows, row.format as ExportFormat);
      if (this.notifications) {
        await this.notifications
          .createNotification({
            userId: row.requestedBy,
            channel: NotificationChannel.IN_APP,
            type: NotificationType.SYSTEM,
            title: "Report ready",
            message: `Your ${row.dataset} export (${row.rowCount} rows) is ready to download.`,
            metadata: { exportId: row.id },
          })
          .catch((error: unknown) =>
            this.logger.warn(`Export notification failed: ${getErrorMessage(error, "unknown")}`),
          );
      }
    } catch (error) {
      row.status = "FAILED";
      row.failureReason = getErrorMessage(error, "generation failed").slice(0, 500);
      await this.exportRepo.save(row);
      throw error;
    }
  }

  async download(
    id: string,
    scope: TenantScope,
    actorId: string,
  ): Promise<{ fileName: string; format: string; contentBase64: string }> {
    const row = await this.exportRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        message: "Export not found",
        error: ApiErrorCode.EXPORT_NOT_FOUND,
      });
    }
    if (row.requestedBy !== actorId) {
      throw new ForbiddenException({
        message: "Export belongs to another user",
        error: ApiErrorCode.ANALYTICS_SCOPE_FORBIDDEN,
      });
    }
    if (scope.merchantId && row.tenantId && row.tenantId !== scope.merchantId) {
      throw new ForbiddenException({
        message: "Export belongs to another tenant",
        error: ApiErrorCode.ANALYTICS_SCOPE_FORBIDDEN,
      });
    }
    if (row.status !== "READY" || !row.content || (row.expiresAt && row.expiresAt < new Date())) {
      throw new NotFoundException({
        message: "Export expired or unavailable",
        error: ApiErrorCode.EXPORT_EXPIRED,
      });
    }
    return {
      fileName: row.fileName ?? `report.${row.format}`,
      format: row.format,
      contentBase64: row.content,
    };
  }

  async listForUser(actorId: string): Promise<ReportExportContract[]> {
    const rows = await this.exportRepo.find({
      where: { requestedBy: actorId },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return rows.map((r) => this.toContract(r));
  }

  private async complete(
    exportId: string,
    headers: string[],
    rows: Array<Array<string | number | null>>,
    format: ExportFormat,
  ): Promise<void> {
    const content =
      format === "xlsx"
        ? toXlsxBase64(headers, rows)
        : Buffer.from(toCsv(headers, rows), "utf8").toString("base64");
    await this.exportRepo.update(
      { id: exportId },
      {
        status: "READY",
        content,
        rowCount: rows.length,
        fileName: `dhruto-${format === "xlsx" ? "report.xlsx" : "report.csv"}`,
        readyAt: new Date(),
      },
    );
  }

  private async buildDataset(
    dataset: ExportDataset,
    scope: TenantScope,
    input: {
      preset?: string;
      from?: string;
      to?: string;
      dataset?: ExportDataset;
      format?: ExportFormat;
    },
  ): Promise<{ headers: string[]; rows: Array<Array<string | number | null>> }> {
    const range = this.ranges.resolve({
      preset: (input.preset as never) ?? "30d",
      from: input.from,
      to: input.to,
    });
    switch (dataset) {
      case "parcels": {
        const trends = await this.metrics.trends(scope, range);
        return {
          headers: ["bucket", "booked", "delivered", "returned", "cod_collected"],
          rows: trends.map((t) => [t.bucket, t.booked, t.delivered, t.returned, t.codCollected]),
        };
      }
      case "rto": {
        const rto = await this.domain.rto(scope, range);
        return {
          headers: ["reason", "count", "percentage"],
          rows: rto.byReason.map((r) => [r.reason, r.count, r.percentage]),
        };
      }
      case "cod": {
        const cod = await this.domain.cod(scope, range);
        return {
          headers: ["bucket", "booked", "collected"],
          rows: cod.overTime.map((t) => [t.bucket, t.booked, t.collected]),
        };
      }
      case "riders": {
        const riders = await this.metrics.riderStats(range, scope.hubId);
        return {
          headers: [
            "rider",
            "hub",
            "assigned",
            "delivered",
            "failed",
            "success_rate",
            "first_attempt_success",
            "avg_hours",
            "cod_collected",
          ],
          rows: riders
            .slice(0, MAX_ROWS)
            .map((r) => [
              r.name,
              r.hubName,
              r.assigned,
              r.delivered,
              r.failed,
              r.successRate,
              r.firstAttemptSuccess,
              r.avgCompletionHours,
              r.codCollected,
            ]),
        };
      }
      case "hubs": {
        const hubs = await this.metrics.hubStats(range, scope.hubId);
        return {
          headers: [
            "hub",
            "code",
            "incoming",
            "dispatched",
            "pending",
            "throughput_per_day",
            "oldest_pending_hours",
          ],
          rows: hubs.map((h) => [
            h.hubName,
            h.code,
            h.incoming,
            h.dispatched,
            h.pending,
            h.throughputPerDay,
            h.oldestPendingHours,
          ]),
        };
      }
      case "finance": {
        const finance = await this.domain.finance(scope, range);
        return {
          headers: ["metric", "amount_minor"],
          rows: [
            ["pending_settlement_minor", finance.pendingSettlementMinor],
            ["settled_minor", finance.settledMinor],
            ["payout_requested_minor", finance.payoutRequestedMinor],
            ["payout_completed_minor", finance.payoutCompletedMinor],
            ["cod_collected_minor", finance.codCollectedMinor],
          ],
        };
      }
      default: {
        const counts = await this.metrics.statusCounts(scope, range);
        return {
          headers: ["status", "count"],
          rows: Object.entries(counts.byStatus).map(([status, count]) => [status, count]),
        };
      }
    }
  }

  /** Removes expired export content (retention hygiene; rows stay as receipts). */
  async sweepExpired(): Promise<number> {
    const expired = await this.exportRepo.find({
      where: { status: "READY", expiresAt: MoreThan(new Date(0)) },
      take: 500,
    });
    let swept = 0;
    const now = new Date();
    for (const row of expired) {
      if (row.expiresAt && row.expiresAt < now && row.content) {
        row.content = null;
        row.status = "EXPIRED";
        await this.exportRepo.save(row);
        swept++;
      }
    }
    return swept;
  }

  private toContract(row: ReportExport): ReportExportContract {
    return {
      id: row.id,
      dataset: row.dataset as ReportExportContract["dataset"],
      format: row.format as ReportExportContract["format"],
      status: row.status as ReportExportContract["status"],
      filters: row.filters,
      rowCount: row.rowCount,
      downloadUrl: row.status === "READY" ? `/analytics/reports/${row.id}/download` : null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
