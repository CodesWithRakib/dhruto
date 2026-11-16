import { Injectable, Optional } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CHAT_AGGREGATE_TYPE } from "../chat.config.js";
import { ChatAttachmentMetrics } from "../attachments/chat-attachment-metrics.js";
import { ChatAttachmentScanService } from "../attachments/chat-attachment-scan.service.js";
import { ChatRealtimeMetricsService } from "../realtime/chat-realtime-metrics.service.js";

/** Signature databases older than this are reported as stale (alerting input). */
function signatureMaxAgeSeconds(): number {
  const hours = Number(process.env.CHAT_CLAMAV_SIGNATURE_MAX_AGE_HOURS ?? "48");
  return (Number.isFinite(hours) && hours > 0 ? hours : 48) * 3600;
}

export interface ChatOperationalStatus {
  status: "ok" | "degraded";
  scanner: {
    configured: boolean;
    reachable: boolean;
    engineVersion: string | null;
    signatureVersion: number | null;
    signatureAgeSeconds: number | null;
    signatureStale: boolean;
  };
  attachments: {
    scanPending: number;
    oldestPendingAgeSeconds: number;
    infected: number;
    failed: number;
  };
  outbox: { pending: number; processing: number; failed: number; oldestPendingAgeSeconds: number };
}

interface CountAge {
  count: number;
  age: number | null;
}

/**
 * Phase 8 operational signals for the communication platform: scanner
 * liveness and signature freshness, scan backlog, blocked attachments, chat
 * outbox lag, and the existing in-process counters (attachments, realtime).
 * Counts and ages only — never ids, names, keys, URLs or content.
 *
 * Queries are index-backed and bounded: partial indexes on chat_attachments
 * (scan_pending / scan_blocked) and event_outbox (status, available_at).
 */
@Injectable()
export class ChatObservabilityService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly scan: ChatAttachmentScanService,
    private readonly attachmentMetrics: ChatAttachmentMetrics,
    @Optional() private readonly realtime?: ChatRealtimeMetricsService,
  ) {}

  async status(): Promise<ChatOperationalStatus> {
    const [probe, pending, blocked, outbox] = await Promise.all([
      this.scan.probeScanner(),
      this.dataSource.query(
        `SELECT count(*)::int AS "count",
                EXTRACT(EPOCH FROM (now() - min("createdAt")))::float AS "age"
           FROM "chat_attachments" WHERE "status" = 'UPLOADED' AND "scan_status" = 'PENDING'`,
      ) as Promise<CountAge[]>,
      this.dataSource.query(
        `SELECT "scan_status" AS "status", count(*)::int AS "count" FROM "chat_attachments"
          WHERE "scan_status" IN ('INFECTED', 'FAILED') GROUP BY "scan_status"`,
      ) as Promise<Array<{ status: string; count: number }>>,
      this.dataSource.query(
        `SELECT "status", count(*)::int AS "count",
                EXTRACT(EPOCH FROM (now() - min("available_at")))::float AS "age"
           FROM "event_outbox"
          WHERE "status" IN ('PENDING', 'PROCESSING', 'FAILED') AND "aggregate_type" = $1
          GROUP BY "status"`,
        [CHAT_AGGREGATE_TYPE],
      ) as Promise<Array<{ status: string; count: number; age: number | null }>>,
    ]);
    const signatureAgeSeconds = probe.signatureDate
      ? Math.max(0, Math.round((Date.now() - probe.signatureDate.getTime()) / 1000))
      : null;
    const signatureStale =
      probe.reachable &&
      (signatureAgeSeconds === null || signatureAgeSeconds > signatureMaxAgeSeconds());
    const byStatus = (status: string) => outbox.find((r) => r.status === status);
    const scanner = {
      configured: this.scan.scannerEngine !== null,
      reachable: probe.reachable,
      engineVersion: probe.engineVersion,
      signatureVersion: probe.signatureVersion,
      signatureAgeSeconds,
      signatureStale,
    };
    return {
      status: scanner.configured && scanner.reachable && !signatureStale ? "ok" : "degraded",
      scanner,
      attachments: {
        scanPending: pending[0]?.count ?? 0,
        oldestPendingAgeSeconds: Math.round(pending[0]?.age ?? 0),
        infected: blocked.find((r) => r.status === "INFECTED")?.count ?? 0,
        failed: blocked.find((r) => r.status === "FAILED")?.count ?? 0,
      },
      outbox: {
        pending: byStatus("PENDING")?.count ?? 0,
        processing: byStatus("PROCESSING")?.count ?? 0,
        failed: byStatus("FAILED")?.count ?? 0,
        oldestPendingAgeSeconds: Math.round(byStatus("PENDING")?.age ?? 0),
      },
    };
  }

  /** Prometheus text lines (appended to the existing exposition endpoint). */
  async prometheusLines(): Promise<string[]> {
    const s = await this.status();
    const counters = this.attachmentMetrics.snapshot();
    const rt = this.realtime?.health();
    const lines = [
      "# HELP dhruto_chat_scanner_up Malware scanner reachable (1/0); 0 also when unconfigured.",
      "# TYPE dhruto_chat_scanner_up gauge",
      `dhruto_chat_scanner_up ${s.scanner.reachable ? 1 : 0}`,
      "# HELP dhruto_chat_scanner_configured Malware scanner configured (1/0).",
      "# TYPE dhruto_chat_scanner_configured gauge",
      `dhruto_chat_scanner_configured ${s.scanner.configured ? 1 : 0}`,
      "# HELP dhruto_chat_scanner_signature_age_seconds Age of the loaded signature database (-1 unknown).",
      "# TYPE dhruto_chat_scanner_signature_age_seconds gauge",
      `dhruto_chat_scanner_signature_age_seconds ${s.scanner.signatureAgeSeconds ?? -1}`,
      "# HELP dhruto_chat_attachments_scan_pending Verified attachments awaiting a malware verdict.",
      "# TYPE dhruto_chat_attachments_scan_pending gauge",
      `dhruto_chat_attachments_scan_pending ${s.attachments.scanPending}`,
      "# HELP dhruto_chat_attachments_scan_oldest_pending_seconds Age of the oldest pending scan.",
      "# TYPE dhruto_chat_attachments_scan_oldest_pending_seconds gauge",
      `dhruto_chat_attachments_scan_oldest_pending_seconds ${s.attachments.oldestPendingAgeSeconds}`,
      "# HELP dhruto_chat_attachments_blocked Blocked attachments by scan status.",
      "# TYPE dhruto_chat_attachments_blocked gauge",
      `dhruto_chat_attachments_blocked{scan_status="INFECTED"} ${s.attachments.infected}`,
      `dhruto_chat_attachments_blocked{scan_status="FAILED"} ${s.attachments.failed}`,
      "# HELP dhruto_chat_outbox_events Chat outbox events by status.",
      "# TYPE dhruto_chat_outbox_events gauge",
      `dhruto_chat_outbox_events{status="PENDING"} ${s.outbox.pending}`,
      `dhruto_chat_outbox_events{status="PROCESSING"} ${s.outbox.processing}`,
      `dhruto_chat_outbox_events{status="FAILED"} ${s.outbox.failed}`,
      "# HELP dhruto_chat_outbox_oldest_pending_seconds Age of the oldest pending chat outbox event.",
      "# TYPE dhruto_chat_outbox_oldest_pending_seconds gauge",
      `dhruto_chat_outbox_oldest_pending_seconds ${s.outbox.oldestPendingAgeSeconds}`,
      "# HELP dhruto_chat_attachment_events_total Per-instance attachment counters since start.",
      "# TYPE dhruto_chat_attachment_events_total counter",
      ...Object.entries(counters.counters).map(
        ([name, value]) => `dhruto_chat_attachment_events_total{event="${name}"} ${value}`,
      ),
      ...Object.entries(counters.rejectedByReason).map(
        ([reason, value]) => `dhruto_chat_attachment_rejected_total{reason="${reason}"} ${value}`,
      ),
    ];
    if (rt) {
      lines.push(
        "# HELP dhruto_chat_realtime_ready Realtime engine ready (1/0).",
        "# TYPE dhruto_chat_realtime_ready gauge",
        `dhruto_chat_realtime_ready ${rt.ready ? 1 : 0}`,
        "# HELP dhruto_chat_realtime_redis_healthy Cross-instance Redis distribution healthy (1/0).",
        "# TYPE dhruto_chat_realtime_redis_healthy gauge",
        `dhruto_chat_realtime_redis_healthy ${rt.redis.healthy ? 1 : 0}`,
        "# HELP dhruto_chat_socket_connections Current authenticated chat sockets on this instance.",
        "# TYPE dhruto_chat_socket_connections gauge",
        `dhruto_chat_socket_connections ${rt.connections.current}`,
        "# HELP dhruto_chat_realtime_events_total Per-instance realtime counters since start.",
        "# TYPE dhruto_chat_realtime_events_total counter",
        `dhruto_chat_realtime_events_total{event="connections"} ${rt.connections.total}`,
        `dhruto_chat_realtime_events_total{event="connections_rejected"} ${rt.connections.rejected}`,
        `dhruto_chat_realtime_events_total{event="rate_limited"} ${rt.events.rateLimited}`,
        `dhruto_chat_realtime_events_total{event="invalid"} ${rt.events.invalid}`,
        `dhruto_chat_realtime_events_total{event="joins_denied"} ${rt.events.joinsDenied}`,
        `dhruto_chat_realtime_events_total{event="revocations"} ${rt.events.revocations}`,
        `dhruto_chat_realtime_events_total{event="fanout_delivered"} ${rt.fanout.delivered}`,
        `dhruto_chat_realtime_events_total{event="fanout_failed"} ${rt.fanout.failed}`,
        "# HELP dhruto_chat_fanout_max_latency_ms Max observed fan-out latency on this instance.",
        "# TYPE dhruto_chat_fanout_max_latency_ms gauge",
        `dhruto_chat_fanout_max_latency_ms ${rt.fanout.maxLatencyMs}`,
      );
    }
    return lines;
  }
}
