import { z } from "zod";

export enum BagStatus {
  OPEN = "OPEN",
  SEALED = "SEALED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  COMPLETED = "COMPLETED",
}

export enum ManifestStatus {
  CREATED = "CREATED",
  DISPATCHED = "DISPATCHED",
  RECEIVED = "RECEIVED",
  RECONCILED = "RECONCILED",
}

export enum HubScanType {
  RECEIVE_INBOUND = "RECEIVE_INBOUND",
  SORT = "SORT",
  BAG_PARCEL = "BAG_PARCEL",
  DISPATCH_BAG = "DISPATCH_BAG",
  RECEIVE_TRANSFER = "RECEIVE_TRANSFER",
}

export const createBagSchema = z.object({
  destinationHubId: z.string().uuid("Invalid destination hub ID"),
  sealTag: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateBagDto = z.infer<typeof createBagSchema>;

export const addParcelToBagSchema = z.object({
  parcelTrackingCode: z.string().trim().min(3, "Tracking code required"),
});

export type AddParcelToBagDto = z.infer<typeof addParcelToBagSchema>;

export const sealBagSchema = z.object({
  sealTag: z.string().trim().min(2, "Seal tag identifier required"),
});

export type SealBagDto = z.infer<typeof sealBagSchema>;

export const createManifestSchema = z.object({
  destinationHubId: z.string().uuid("Invalid destination hub ID"),
  bagIds: z.array(z.string().uuid()).min(1, "Select at least one bag for manifest"),
  vehicleNumber: z.string().trim().min(3, "Vehicle number required"),
  driverName: z.string().trim().optional(),
  driverPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateManifestDto = z.infer<typeof createManifestSchema>;

export const hubScanSchema = z.object({
  barcode: z.string().trim().min(3, "Barcode required"),
  scanType: z.nativeEnum(HubScanType),
  bagId: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
});

export type HubScanDto = z.infer<typeof hubScanSchema>;

export const hubScanResultSchema = z.object({
  success: z.boolean(),
  scanType: z.nativeEnum(HubScanType),
  barcode: z.string(),
  itemType: z.enum(["PARCEL", "BAG"]),
  previousStatus: z.string().optional(),
  currentStatus: z.string(),
  message: z.string(),
  routingInfo: z.object({
    originHubName: z.string().optional(),
    destinationHubName: z.string().optional(),
    currentHubName: z.string().optional(),
  }).optional(),
  timestamp: z.string(),
});

export type HubScanResult = z.infer<typeof hubScanResultSchema>;
