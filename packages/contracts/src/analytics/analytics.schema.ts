import { z } from "zod";

export const analyticsPeriodSchema = z.enum(["7d", "30d", "90d", "custom"]);
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const analyticsQuerySchema = z.object({
  period: analyticsPeriodSchema.optional().default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  merchantId: z.string().uuid().optional(),
  hubId: z.string().uuid().optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface MerchantKpis {
  totalOrders: number;
  deliveredOrders: number;
  inTransitOrders: number;
  pendingOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  deliverySuccessRate: number; // 0 - 100%
  rtoRate: number; // 0 - 100%
  avgDeliveryHours: number;
}

export interface MerchantFinancialAnalytics {
  totalBookedCod: number;
  collectedCod: number;
  pendingCod: number;
  deliveryCharges: number;
  netSettledPayouts: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  booked: number;
  delivered: number;
  returned: number;
  codCollected: number;
}

export interface DistrictMetric {
  district: string;
  orderCount: number;
  percentage: number;
  successRate: number;
}

export interface MerchantAnalyticsSummary {
  period: string;
  startDate: string;
  endDate: string;
  kpis: MerchantKpis;
  financials: MerchantFinancialAnalytics;
  statusBreakdown: Record<string, number>;
  dailyTrends: DailyTrendPoint[];
  topDistricts: DistrictMetric[];
}

export interface HubThroughputMetric {
  hubId: string;
  hubName: string;
  code: string;
  totalIncoming: number;
  totalSorted: number;
  totalDispatched: number;
  inventoryCount: number;
}

export interface TopRiderMetric {
  riderId: string;
  name: string;
  phone: string;
  hubName: string;
  deliveredCount: number;
  completionRate: number;
  cashCollected: number;
}

export interface RtoReasonMetric {
  reason: string;
  count: number;
  percentage: number;
}

export interface ZoneRtoMetric {
  zone: string;
  parcelCount: number;
  rtoRate: number;
}

export interface RiskTierRtoMetric {
  tier: string;
  parcelCount: number;
  rtoRate: number;
}

export interface RtoAnalytics {
  overallRtoRate: number;
  topReasons: RtoReasonMetric[];
  byZone: ZoneRtoMetric[];
  byRiskTier: RiskTierRtoMetric[];
}

export interface CodFlowAnalytics {
  totalBooked: number;
  inTransitWithRiders: number;
  collectedUnsettled: number;
  settledToMerchants: number;
}

export interface OperationalAnalyticsSummary {
  period: string;
  totalShipments: number;
  activeHubsCount: number;
  activeRidersCount: number;
  networkSuccessRate: number;
  networkRtoRate: number;
  totalCodProcessed: number;
  outstandingCashWithRiders: number;
  hubThroughputList: HubThroughputMetric[];
  topRiders: TopRiderMetric[];
  rtoBreakdown: RtoAnalytics;
  codFlow: CodFlowAnalytics;
}
