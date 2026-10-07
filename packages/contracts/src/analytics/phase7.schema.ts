import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Business timezone + date filter contract                            */
/* ------------------------------------------------------------------ */

/** Analytics business timezone for Asia/Dhaka operations. */
export const ANALYTICS_TIMEZONE = "Asia/Dhaka" as const;
/** Maximum analytics window: 366 days (prevents accidental full-table scans). */
export const ANALYTICS_MAX_RANGE_DAYS = 366 as const;

export const analyticsPresetSchema = z.enum([
  "today",
  "yesterday",
  "7d",
  "30d",
  "month",
  "last-month",
  "90d",
  "custom",
]);
export type AnalyticsPreset = z.infer<typeof analyticsPresetSchema>;

export const dateFilterSchema = z
  .object({
    preset: analyticsPresetSchema.optional().default("30d"),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    timezone: z.string().max(64).optional().default(ANALYTICS_TIMEZONE),
  })
  .refine(
    (v) => {
      if (v.preset !== "custom") return true;
      return !!v.from && !!v.to;
    },
    { message: "Custom range requires from and to", path: ["from"] },
  )
  .refine(
    (v) => {
      if (!v.from || !v.to) return true;
      return new Date(v.from).getTime() <= new Date(v.to).getTime();
    },
    { message: "from must be <= to", path: ["from"] },
  );

export type DateFilter = z.infer<typeof dateFilterSchema>;

export interface ResolvedRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  timezone: string;
  granularity: "hour" | "day" | "week" | "month";
}

/* ------------------------------------------------------------------ */
/* Centralized metric catalog (single source of truth)                 */
/* ------------------------------------------------------------------ */

export interface MetricDefinition {
  metricKey: string;
  name: string;
  description: string;
  calculation: string;
  scope: "platform" | "merchant" | "hub" | "rider";
  allowedRoles: string[];
  timeBasis: string;
  dataSource: string;
}

/**
 * Canonical metric definitions. Frontend never re-implements these formulas.
 *
 * Delivery Success Rate = parcels reaching DELIVERED / eligible parcels
 * (eligible = terminal DELIVERED + RTO-ladder + CANCELLED + failed attempts;
 * pending/in-transit excluded — they have no outcome yet).
 * RTO Rate = parcels entering the RTO ladder / eligible parcels.
 */
export const METRIC_CATALOG: Record<string, MetricDefinition> = {
  total_parcels: {
    metricKey: "total_parcels",
    name: "Total Parcels",
    description: "Parcels created in range.",
    calculation: "COUNT(parcels WHERE createdAt IN range)",
    scope: "platform",
    allowedRoles: ["ADMIN", "MERCHANT", "HUB_MANAGER"],
    timeBasis: "createdAt",
    dataSource: "parcels",
  },
  delivery_success_rate: {
    metricKey: "delivery_success_rate",
    name: "Delivery Success Rate",
    description: "Delivered parcels over eligible parcels with a terminal outcome.",
    calculation: "delivered / (delivered + rto + cancelled + failed) * 100",
    scope: "platform",
    allowedRoles: ["ADMIN", "MERCHANT", "HUB_MANAGER"],
    timeBasis: "createdAt",
    dataSource: "parcels",
  },
  rto_rate: {
    metricKey: "rto_rate",
    name: "RTO Rate",
    description: "Parcels entering the RTO ladder over eligible parcels.",
    calculation: "rto / (delivered + rto + cancelled + failed) * 100",
    scope: "platform",
    allowedRoles: ["ADMIN", "MERCHANT", "HUB_MANAGER"],
    timeBasis: "createdAt",
    dataSource: "parcels",
  },
  average_delivery_hours: {
    metricKey: "average_delivery_hours",
    name: "Average Delivery Time",
    description: "Mean CREATED → DELIVERED hours from status history (not updatedAt).",
    calculation: "AVG(deliveredAt - createdAt) over delivered parcels",
    scope: "platform",
    allowedRoles: ["ADMIN", "MERCHANT", "HUB_MANAGER"],
    timeBasis: "status history",
    dataSource: "parcel_status_history",
  },
  cod_collection_rate: {
    metricKey: "cod_collection_rate",
    name: "COD Collection Rate",
    description: "Collected COD over eligible COD (collected + failed/returned).",
    calculation: "collected / (collected + failed) * 100",
    scope: "platform",
    allowedRoles: ["ADMIN", "MERCHANT"],
    timeBasis: "collectedAt",
    dataSource: "cash_ledgers",
  },
  rider_completion_rate: {
    metricKey: "rider_completion_rate",
    name: "Rider Completion Rate",
    description: "Delivered attempts over total attempts per rider.",
    calculation: "DELIVERED attempts / all attempts * 100",
    scope: "rider",
    allowedRoles: ["ADMIN", "HUB_MANAGER"],
    timeBasis: "attempt createdAt",
    dataSource: "delivery_attempts",
  },
  hub_throughput: {
    metricKey: "hub_throughput",
    name: "Hub Throughput",
    description: "Parcels scanned at the hub per period (receive events).",
    calculation: "COUNT(parcel_scans receive events) per hub per period",
    scope: "hub",
    allowedRoles: ["ADMIN", "HUB_MANAGER"],
    timeBasis: "scan createdAt",
    dataSource: "parcel_scans",
  },
  first_attempt_success_rate: {
    metricKey: "first_attempt_success_rate",
    name: "First-Attempt Success",
    description: "Parcels delivered on attempt 1 over parcels with any attempt.",
    calculation: "attempt-1 DELIVERED / parcels attempted * 100",
    scope: "rider",
    allowedRoles: ["ADMIN", "HUB_MANAGER"],
    timeBasis: "attempt createdAt",
    dataSource: "delivery_attempts",
  },
};

/* ------------------------------------------------------------------ */
/* Shared response shapes (aggregated, never raw dumps)                */
/* ------------------------------------------------------------------ */

export interface KpiValue {
  /** Null value + noData means "no eligible records", not zero. */
  value: number | null;
  previous: number | null;
  changePct: number | null;
  trend: "up" | "down" | "flat";
  noData: boolean;
}

export interface TrendPoint {
  bucket: string;
  booked: number;
  delivered: number;
  returned: number;
  codCollected: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversionPct: number | null;
  dropoff: number | null;
}

export interface LatencyPercentiles {
  count: number;
  avgHours: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
}

export interface BacklogBucket {
  bucket: string;
  count: number;
  oldestHours: number | null;
}

export const BACKLOG_BUCKETS = [
  "<6h",
  "6-12h",
  "12-24h",
  "1-2d",
  "2d+",
] as const;

export interface OverviewResponse {
  range: ResolvedRange;
  generatedAt: string;
  kpis: {
    totalParcels: KpiValue;
    delivered: KpiValue;
    inTransit: number;
    successRate: KpiValue;
    rtoRate: KpiValue;
    avgDeliveryHours: KpiValue;
    codCollected: KpiValue;
    pendingSettlement: KpiValue;
    activeMerchants: number;
    activeRiders: number;
    activeHubs: number;
  };
  trends: TrendPoint[];
  generatedAtNote: string;
}

export interface ParcelAnalyticsResponse {
  range: ResolvedRange;
  funnel: FunnelStage[];
  statusBreakdown: Record<string, number>;
  latency: LatencyPercentiles;
  bottlenecks: Array<{ stage: string; avgHours: number | null; count: number }>;
}

export interface HubAnalyticsItem {
  hubId: string;
  hubName: string;
  code: string;
  incoming: number;
  dispatched: number;
  pending: number;
  throughputPerDay: number;
  backlog: BacklogBucket[];
  oldestPendingHours: number | null;
}

export interface RiderAnalyticsItem {
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
}

export interface MerchantCompareItem {
  merchantId: string;
  merchantName: string;
  parcels: number;
  delivered: number;
  successRate: number | null;
  rtoRate: number | null;
  codVolume: number;
  avgDeliveryHours: number | null;
}

export interface RtoAnalyticsV2 {
  range: ResolvedRange;
  rtoCount: number;
  rtoRate: KpiValue;
  byReason: Array<{ reason: string; count: number; percentage: number }>;
  byDistrict: Array<{ district: string; count: number; rtoRate: number | null }>;
  byHub: Array<{ hubId: string; hubName: string; count: number }>;
  byMerchant: Array<{ merchantId: string; merchantName: string; count: number }>;
  overTime: Array<{ bucket: string; count: number; rate: number | null }>;
  costNote: string;
}

export interface CodAnalyticsV2 {
  range: ResolvedRange;
  booked: number;
  collected: number;
  pending: number;
  failed: number;
  collectionRate: number | null;
  overTime: Array<{ bucket: string; booked: number; collected: number }>;
}

export interface FinanceAnalyticsResponse {
  range: ResolvedRange;
  pendingSettlementMinor: number;
  settledMinor: number;
  payoutRequestedMinor: number;
  payoutCompletedMinor: number;
  codCollectedMinor: number;
  sourceNote: string;
}

export interface NotificationAnalyticsResponse {
  range: ResolvedRange;
  byChannel: Array<{ channel: string; sent: number; failed: number; deliveryRate: number | null }>;
  retries: number;
  deadLetter: number;
  failureRate: number | null;
}

export interface WebhookAnalyticsResponse {
  range: ResolvedRange;
  total: number;
  delivered: number;
  failed4xx: number;
  failed5xx: number;
  pending: number;
  deadLetter: number;
  successRate: number | null;
}

export interface IntelligenceAnalyticsResponse {
  range: ResolvedRange;
  address: { parses: number; highConfidence: number; lowConfidence: number; confirmations: number };
  risk: { snapshots: number; high: number; unknownShare: number | null; overrides: number };
  rto: {
    predictions: number;
    outcomes: number;
    correct: number;
    precision: number | null;
    recall: number | null;
    insufficientData: boolean;
  };
  byModelVersion: Array<{ modelVersion: string; predictions: number; outcomes: number; precision: number | null }>;
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface AlertDefinition {
  alertKey: string;
  metric: string;
  operator: ">" | "<";
  threshold: number;
  severity: AlertSeverity;
  scope: string;
  enabled: boolean;
}

export const DEFAULT_ALERT_DEFINITIONS: AlertDefinition[] = [
  { alertKey: "RTO_RATE_SPIKE", metric: "rto_rate", operator: ">", threshold: 15, severity: "WARNING", scope: "platform", enabled: true },
  { alertKey: "RTO_RATE_CRITICAL", metric: "rto_rate", operator: ">", threshold: 25, severity: "CRITICAL", scope: "platform", enabled: true },
  { alertKey: "SUCCESS_RATE_DROP", metric: "delivery_success_rate", operator: "<", threshold: 85, severity: "WARNING", scope: "platform", enabled: true },
  { alertKey: "HUB_BACKLOG_HIGH", metric: "hub_pending", operator: ">", threshold: 200, severity: "WARNING", scope: "hub", enabled: true },
  { alertKey: "NOTIFICATION_FAILURE_SPIKE", metric: "notification_failure_rate", operator: ">", threshold: 10, severity: "WARNING", scope: "platform", enabled: true },
];

export interface AnalyticsAlert {
  id: string;
  alertKey: string;
  severity: AlertSeverity;
  status: AlertStatus;
  scope: string;
  metricValue: number;
  threshold: number;
  dedupKey: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_STATUSES = ["PENDING", "READY", "EXPIRED", "FAILED"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const EXPORT_DATASETS = [
  "parcels",
  "rto",
  "cod",
  "riders",
  "hubs",
  "finance",
] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

export const exportRequestSchema = z.object({
  dataset: z.enum(EXPORT_DATASETS),
  format: z.enum(EXPORT_FORMATS).default("csv"),
  preset: analyticsPresetSchema.optional().default("30d"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export interface ReportExport {
  id: string;
  dataset: ExportDataset;
  format: ExportFormat;
  status: ExportStatus;
  filters: Record<string, unknown>;
  rowCount: number | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
}
