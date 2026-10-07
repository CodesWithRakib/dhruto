import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Hub                                                                 */
/* ------------------------------------------------------------------ */

/** Physical classification of a hub facility. Controlled enum, never free text. */
export enum HubType {
  ORIGIN = "ORIGIN",
  DESTINATION = "DESTINATION",
  SORTING = "SORTING",
  REGIONAL = "REGIONAL",
  CENTRAL = "CENTRAL",
}

/**
 * Hub lifecycle. `INACTIVE` and `MAINTENANCE` hubs must not accept new
 * operational transactions (scans, bagging, manifest creation or dispatch).
 */
export enum HubStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
}

/**
 * Hub code format: two 2-4 letter groups and a 2-3 digit sequence, e.g.
 * `HUB-DHK-01` (the existing seed convention) or `DHK-HUB-01`.
 */
export const HUB_CODE_REGEX = /^[A-Z]{2,4}-[A-Z]{2,4}-\d{2,3}$/;

export const hubSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: z.nativeEnum(HubType),
  status: z.nativeEnum(HubStatus),
  district: z.string().nullable(),
  thana: z.string().nullable(),
  address: z.string(),
});

export type HubSummary = z.infer<typeof hubSummarySchema>;

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Centralized hub permissions. Role -> permission mapping lives in
 * `apps/api/src/common/permissions/hub-permissions.ts`; the backend always
 * derives the set from the authenticated user, never from the request body.
 */
export enum HubPermission {
  VIEW = "hub.view",
  SCAN = "hub.scan",
  BAG_CREATE = "hub.bag.create",
  BAG_SEAL = "hub.bag.seal",
  MANIFEST_CREATE = "hub.manifest.create",
  MANIFEST_DISPATCH = "hub.manifest.dispatch",
  MANIFEST_RECEIVE = "hub.manifest.receive",
  EXCEPTION_RESOLVE = "hub.exception.resolve",
}

/* ------------------------------------------------------------------ */
/* Bags                                                                */
/* ------------------------------------------------------------------ */

export enum BagStatus {
  OPEN = "OPEN",
  SEALED = "SEALED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

/** Statuses in which a bag still accepts new parcels. */
export const BAG_OPEN_STATUSES: readonly BagStatus[] = [BagStatus.OPEN];

/* ------------------------------------------------------------------ */
/* Manifests                                                           */
/* ------------------------------------------------------------------ */

export enum ManifestStatus {
  CREATED = "CREATED",
  DISPATCHED = "DISPATCHED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  RECONCILED = "RECONCILED",
  CANCELLED = "CANCELLED",
}

/** Statuses after which manifest membership is frozen. */
export const MANIFEST_LOCKED_STATUSES: readonly ManifestStatus[] = [
  ManifestStatus.DISPATCHED,
  ManifestStatus.IN_TRANSIT,
  ManifestStatus.RECEIVED,
  ManifestStatus.RECONCILED,
];

/* ------------------------------------------------------------------ */
/* Operational exceptions                                              */
/* ------------------------------------------------------------------ */

export enum OperationalExceptionType {
  MISSING_PARCEL = "MISSING_PARCEL",
  MISSING_BAG = "MISSING_BAG",
  UNEXPECTED_PARCEL = "UNEXPECTED_PARCEL",
  UNEXPECTED_BAG = "UNEXPECTED_BAG",
  WRONG_DESTINATION = "WRONG_DESTINATION",
  WRONG_HUB = "WRONG_HUB",
  DUPLICATE_SCAN = "DUPLICATE_SCAN",
  DAMAGED = "DAMAGED",
  INVALID_STATE = "INVALID_STATE",
}

export enum ExceptionStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export const resolveExceptionSchema = z.object({
  resolutionNote: z.string().trim().min(3).max(500),
});

export type ResolveExceptionDto = z.infer<typeof resolveExceptionSchema>;

/* ------------------------------------------------------------------ */
/* Scans                                                               */
/* ------------------------------------------------------------------ */

/**
 * Hub scan operations. A scan is always recorded as an append-only
 * `parcel_scans` row, whatever its outcome.
 */
export enum HubScanType {
  /** Parcel physically arrives at a hub (origin or transit). */
  RECEIVE_INBOUND = "RECEIVE_INBOUND",
  /** Parcel is placed into an OPEN bag. */
  BAG_PARCEL = "BAG_PARCEL",
  /** Sealed bag is dispatched into transit. */
  DISPATCH_BAG = "DISPATCH_BAG",
  /** Bag or parcel is received at the destination hub. */
  RECEIVE_TRANSFER = "RECEIVE_TRANSFER",
  /** Sort/verification scan that does not change status. */
  SORT = "SORT",
  /** Operator flags an operational problem. */
  EXCEPTION = "EXCEPTION",
}

/** Outcome of a scan. Every attempt is persisted regardless of outcome. */
export enum ScanOutcome {
  APPLIED = "APPLIED",
  DUPLICATE = "DUPLICATE",
  REJECTED = "REJECTED",
}

export const hubScanSchema = z.object({
  barcode: z.string().trim().min(3, "Barcode required").max(64),
  scanType: z.nativeEnum(HubScanType),
  bagId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
  /** Client-generated key so a retried/submitted-twice scan is not double-recorded. */
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export type HubScanDto = z.infer<typeof hubScanSchema>;

export const hubScanResultSchema = z.object({
  success: z.boolean(),
  outcome: z.nativeEnum(ScanOutcome),
  scanType: z.nativeEnum(HubScanType),
  barcode: z.string(),
  itemType: z.enum(["PARCEL", "BAG", "UNKNOWN"]),
  parcelId: z.string().uuid().optional(),
  bagId: z.string().uuid().optional(),
  previousStatus: z.string().optional(),
  currentStatus: z.string(),
  message: z.string(),
  /** Machine-readable reason when `outcome` is DUPLICATE or REJECTED. */
  reasonCode: z.string().optional(),
  exceptionType: z.nativeEnum(OperationalExceptionType).optional(),
  exceptionId: z.string().uuid().optional(),
  routingInfo: z
    .object({
      originHubName: z.string().optional(),
      destinationHubName: z.string().optional(),
      currentHubName: z.string().optional(),
    })
    .optional(),
  timestamp: z.string(),
});

export type HubScanResult = z.infer<typeof hubScanResultSchema>;

/** Append-only scan log row as returned to operators. */
export const parcelScanItemSchema = z.object({
  id: z.string().uuid(),
  trackingCode: z.string().nullable(),
  bagCode: z.string().nullable(),
  hubCode: z.string(),
  hubName: z.string(),
  scanType: z.nativeEnum(HubScanType),
  outcome: z.nativeEnum(ScanOutcome),
  reasonCode: z.string().nullable(),
  operatorName: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export type ParcelScanItem = z.infer<typeof parcelScanItemSchema>;

export const operationalExceptionItemSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(OperationalExceptionType),
  status: z.nativeEnum(ExceptionStatus),
  description: z.string(),
  hubCode: z.string(),
  hubName: z.string(),
  trackingCode: z.string().nullable(),
  bagCode: z.string().nullable(),
  manifestCode: z.string().nullable(),
  raisedByName: z.string().nullable(),
  resolvedByName: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  createdAt: z.string(),
});

export type OperationalExceptionItem = z.infer<typeof operationalExceptionItemSchema>;

/* ------------------------------------------------------------------ */
/* Bags - DTOs and responses                                           */
/* ------------------------------------------------------------------ */

export const createBagSchema = z.object({
  destinationHubId: z.string().uuid("Invalid destination hub ID"),
  sealTag: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateBagDto = z.infer<typeof createBagSchema>;

export const addParcelToBagSchema = z.object({
  parcelTrackingCode: z.string().trim().min(3, "Tracking code required").max(64),
});

export type AddParcelToBagDto = z.infer<typeof addParcelToBagSchema>;

export const sealBagSchema = z.object({
  sealTag: z.string().trim().min(2, "Seal tag identifier required").max(100),
});

export type SealBagDto = z.infer<typeof sealBagSchema>;

export const bagListItemSchema = z.object({
  id: z.string().uuid(),
  bagCode: z.string(),
  originHubCode: z.string(),
  originHubName: z.string(),
  destinationHubCode: z.string(),
  destinationHubName: z.string(),
  status: z.nativeEnum(BagStatus),
  sealTag: z.string().nullable(),
  parcelCount: z.number().int().nonnegative(),
  totalWeightKg: z.number(),
  createdAt: z.string(),
  sealedAt: z.string().nullable(),
  dispatchedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
});

export type BagListItem = z.infer<typeof bagListItemSchema>;

export const bagParcelItemSchema = z.object({
  id: z.string().uuid(),
  trackingCode: z.string(),
  recipientName: z.string(),
  district: z.string().nullable(),
  weightKg: z.number(),
  status: z.string(),
  addedAt: z.string(),
});

export type BagParcelItem = z.infer<typeof bagParcelItemSchema>;

export const bagDetailsSchema = bagListItemSchema.extend({
  notes: z.string().nullable(),
  createdByName: z.string().nullable(),
  sealedByName: z.string().nullable(),
  sealTag: z.string().nullable(),
  manifestId: z.string().uuid().nullable(),
  manifestCode: z.string().nullable(),
  parcels: z.array(bagParcelItemSchema),
});

export type BagDetails = z.infer<typeof bagDetailsSchema>;

/* ------------------------------------------------------------------ */
/* Manifests - DTOs and responses                                      */
/* ------------------------------------------------------------------ */

export const createManifestSchema = z.object({
  destinationHubId: z.string().uuid("Invalid destination hub ID"),
  bagIds: z.array(z.string().uuid()).min(1, "Select at least one bag for manifest").max(200),
  vehicleNumber: z.string().trim().min(3).max(50),
  driverName: z.string().trim().max(150).optional(),
  driverPhone: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateManifestDto = z.infer<typeof createManifestSchema>;

export const manifestListItemSchema = z.object({
  id: z.string().uuid(),
  manifestCode: z.string(),
  originHubCode: z.string(),
  originHubName: z.string(),
  destinationHubCode: z.string(),
  destinationHubName: z.string(),
  status: z.nativeEnum(ManifestStatus),
  vehicleNumber: z.string(),
  driverName: z.string().nullable(),
  driverPhone: z.string().nullable(),
  bagCount: z.number().int().nonnegative(),
  parcelCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  dispatchedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
});

export type ManifestListItem = z.infer<typeof manifestListItemSchema>;

/**
 * Receiving reconciliation: what the manifest said should arrive versus what
 * the destination hub actually scanned.
 */
export const manifestReconciliationSchema = z.object({
  expectedBagCount: z.number().int().nonnegative(),
  receivedBagCount: z.number().int().nonnegative(),
  expectedParcelCount: z.number().int().nonnegative(),
  receivedParcelCount: z.number().int().nonnegative(),
  missingBagCodes: z.array(z.string()),
  unexpectedBagCodes: z.array(z.string()),
  missingTrackingCodes: z.array(z.string()),
  unexpectedTrackingCodes: z.array(z.string()),
  isComplete: z.boolean(),
});

export type ManifestReconciliation = z.infer<typeof manifestReconciliationSchema>;

export const manifestDetailsSchema = manifestListItemSchema.extend({
  notes: z.string().nullable(),
  createdByName: z.string().nullable(),
  dispatchedByName: z.string().nullable(),
  receivedByName: z.string().nullable(),
  bags: z.array(bagListItemSchema),
  reconciliation: manifestReconciliationSchema,
});

export type ManifestDetails = z.infer<typeof manifestDetailsSchema>;

export const receiveManifestSchema = z.object({
  /** Bag codes physically scanned at the destination hub, in any order. */
  scannedBagCodes: z.array(z.string().trim().min(3).max(64)).max(500),
  /** Explicitly allow closing the manifest with bags still missing. */
  allowPartial: z.boolean().default(false),
});

export type ReceiveManifestDto = z.infer<typeof receiveManifestSchema>;

/* ------------------------------------------------------------------ */
/* Hub dashboard                                                       */
/* ------------------------------------------------------------------ */

export const hubDashboardSchema = z.object({
  hub: hubSummarySchema,
  metrics: z.object({
    inboundToday: z.number().int().nonnegative(),
    outboundToday: z.number().int().nonnegative(),
    parcelsAtHub: z.number().int().nonnegative(),
    openBags: z.number().int().nonnegative(),
    sealedBags: z.number().int().nonnegative(),
    pendingManifests: z.number().int().nonnegative(),
    dispatchedManifests: z.number().int().nonnegative(),
    expectedInboundManifests: z.number().int().nonnegative(),
    openExceptions: z.number().int().nonnegative(),
  }),
  recentScans: z.array(parcelScanItemSchema),
});

export type HubDashboard = z.infer<typeof hubDashboardSchema>;

export const hubInventorySchema = z.object({
  hub: hubSummarySchema,
  counts: z.object({
    inboundCount: z.number().int().nonnegative(),
    receivedCount: z.number().int().nonnegative(),
    baggedCount: z.number().int().nonnegative(),
    openBagsCount: z.number().int().nonnegative(),
  }),
  parcels: z.array(
    z.object({
      id: z.string().uuid(),
      trackingCode: z.string(),
      recipientName: z.string(),
      district: z.string().nullable(),
      status: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

export type HubInventory = z.infer<typeof hubInventorySchema>;
