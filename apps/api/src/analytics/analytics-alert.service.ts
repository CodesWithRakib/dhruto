import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import {
  DEFAULT_ALERT_DEFINITIONS,
  type AnalyticsAlert as AlertContract,
  type AlertStatus,
} from "@dhruto/contracts";
import { AnalyticsAlert } from "../database/entities/AnalyticsAlert.entity.js";
import { User, UserRole } from "../database/entities/User.entity.js";
import { AnalyticsMetricsService, type TenantScope } from "./analytics-metrics.service.js";
import { AnalyticsDomainService } from "./analytics-domain.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";
import { getErrorMessage } from "../common/utils/error.util.js";
import type { ResolvedRange } from "@dhruto/contracts";

/**
 * Deterministic operational alert evaluation.
 *
 * Rules come from `DEFAULT_ALERT_DEFINITIONS` (centralized, not hardcoded in
 * UI). One OPEN row per dedupKey (key + scope + day bucket); repeat
 * evaluations suppress duplicates. CRITICAL triggers fan out through the
 * Phase 5 notification system to admin in-app inboxes.
 */
@Injectable()
export class AnalyticsAlertService {
  private readonly logger = new Logger(AnalyticsAlertService.name);

  constructor(
    @InjectRepository(AnalyticsAlert)
    private readonly alertRepo: Repository<AnalyticsAlert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly metrics: AnalyticsMetricsService,
    private readonly domain: AnalyticsDomainService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async list(status?: AlertStatus, limit = 100): Promise<AlertContract[]> {
    const rows = await this.alertRepo.find({
      where: status ? { status } : {},
      order: { triggeredAt: "DESC" },
      take: Math.min(200, Math.max(1, limit)),
    });
    return rows.map((r) => this.toContract(r));
  }

  async acknowledge(id: string, actorId: string): Promise<AlertContract> {
    const row = await this.alertRepo.findOne({ where: { id } });
    if (!row) throw new Error("Alert not found");
    if (row.status === "OPEN") {
      row.status = "ACKNOWLEDGED";
      row.acknowledgedBy = actorId;
      row.acknowledgedAt = new Date();
      await this.alertRepo.save(row);
    }
    return this.toContract(row);
  }

  /** Evaluates all enabled rules for a scope; returns triggered alerts. */
  async evaluate(scope: TenantScope, range: ResolvedRange): Promise<AlertContract[]> {
    const triggered: AlertContract[] = [];
    const dayBucket = new Date(range.to).toISOString().slice(0, 10);

    const counts = await this.metrics.statusCounts(scope, range);
    const eligible = this.metrics.eligible(
      counts.delivered,
      counts.rto,
      counts.failed,
      counts.cancelled,
    );
    const rtoRate = this.metrics.rate(counts.rto, eligible) ?? 0;
    const successRate = this.metrics.rate(counts.delivered, eligible) ?? 100;

    const notif = await this.domain.notifications(scope, range);
    const notifFailure = notif.failureRate ?? 0;

    const hubPending: Array<{ hubId: string; pending: number }> = [];
    const hubs = await this.metrics.hubStats(range, scope.hubId);
    for (const h of hubs) hubPending.push({ hubId: h.hubId, pending: h.pending });
    const maxHubPending = hubPending.reduce((m, h) => Math.max(m, h.pending), 0);

    const values: Record<string, number> = {
      rto_rate: rtoRate,
      delivery_success_rate: successRate,
      hub_pending: maxHubPending,
      notification_failure_rate: notifFailure,
    };

    for (const def of DEFAULT_ALERT_DEFINITIONS) {
      if (!def.enabled) continue;
      const value = values[def.metric];
      if (value === undefined) continue;
      const fires = def.operator === ">" ? value > def.threshold : value < def.threshold;
      const dedupKey = `${def.alertKey}:${def.scope}:${scope.merchantId ?? scope.hubId ?? "platform"}:${dayBucket}`;
      if (!fires) {
        await this.resolveIfOpen(dedupKey);
        continue;
      }
      const existing = await this.alertRepo.findOne({ where: { dedupKey } });
      if (existing && existing.status !== "RESOLVED") continue; // dedup
      const row = await this.alertRepo.save(
        this.alertRepo.create({
          alertKey: def.alertKey,
          severity: def.severity,
          status: "OPEN",
          scope: def.scope,
          scopeId: scope.merchantId ?? scope.hubId ?? null,
          metricValue: Math.round(value * 100) / 100,
          threshold: def.threshold,
          dedupKey,
          triggeredAt: new Date(),
        }),
      );
      this.logger.log(
        `ALERT_TRIGGERED key=${def.alertKey} value=${value} severity=${def.severity}`,
      );
      if (def.severity === "CRITICAL") {
        await this.notifyAdmins(def.alertKey, value, def.threshold).catch((error: unknown) =>
          this.logger.warn(`Alert notification failed: ${getErrorMessage(error, "unknown")}`),
        );
      }
      triggered.push(this.toContract(row));
    }
    return triggered;
  }

  private async resolveIfOpen(dedupKey: string): Promise<void> {
    const open = await this.alertRepo.findOne({ where: { dedupKey, status: "OPEN" } });
    if (open) {
      open.status = "RESOLVED";
      open.resolvedAt = new Date();
      await this.alertRepo.save(open);
    }
  }

  private async notifyAdmins(alertKey: string, value: number, threshold: number): Promise<void> {
    if (!this.notifications) return;
    const admins = await this.userRepo.find({ where: { role: UserRole.ADMIN }, take: 20 });
    for (const admin of admins) {
      try {
        const created = await this.notifications.createNotification({
          userId: admin.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.SYSTEM,
          title: `Critical alert: ${alertKey}`,
          message: `${alertKey} breached threshold ${threshold} (current ${Math.round(value * 100) / 100}). Review analytics.`,
          metadata: { alertKey, metricValue: value, threshold },
        });
        void created;
      } catch (error) {
        this.logger.warn(`Admin alert notify failed: ${getErrorMessage(error, "unknown")}`);
      }
    }
  }

  /** Resolves alerts older than 7 days that are still open (stale hygiene). */
  async resolveStale(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const stale = await this.alertRepo.find({
      where: { status: "OPEN", triggeredAt: MoreThan(new Date(0)) },
      take: 500,
    });
    let resolved = 0;
    for (const row of stale) {
      if (row.triggeredAt < cutoff) {
        row.status = "RESOLVED";
        row.resolvedAt = new Date();
        await this.alertRepo.save(row);
        resolved++;
      }
    }
    return resolved;
  }

  private toContract(row: AnalyticsAlert): AlertContract {
    return {
      id: row.id,
      alertKey: row.alertKey,
      severity: row.severity as AlertContract["severity"],
      status: row.status as AlertContract["status"],
      scope: row.scope,
      metricValue: row.metricValue,
      threshold: row.threshold,
      dedupKey: row.dedupKey,
      triggeredAt: row.triggeredAt.toISOString(),
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }
}
