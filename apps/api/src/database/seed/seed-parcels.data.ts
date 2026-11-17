import { ParcelStatus } from "@dhruto/contracts";
import { SEED_PARCELS_COMPLETED } from "./seed-parcels-completed.data.js";
import { SEED_PARCELS_TRANSIT } from "./seed-parcels-transit.data.js";

export interface SeedParcelData {
  trackingCode: string;
  merchantEmail: string;
  riderEmail?: string;
  hubCode?: string;
  recipientName: string;
  recipientPhone: string;
  rawAddress: string;
  district: string;
  thana: string;
  weight: number;
  codAmount: number;
  deliveryFee: number;
  status: ParcelStatus;
  createdAtOffsetHours: number;
}

export const SEED_PARCELS: SeedParcelData[] = [
  ...SEED_PARCELS_COMPLETED,
  ...SEED_PARCELS_TRANSIT,
];
