import { MerchantStatus } from "../entities/Merchant.entity.js";

export interface SeedMerchantData {
  userEmail: string;
  businessName: string;
  contactPhone: string;
  pickupAddress: string;
  status: MerchantStatus;
}

export const SEED_MERCHANTS: SeedMerchantData[] = [
  {
    userEmail: "merchant@dhruto.com",
    businessName: "Rahim Enterprise BD",
    contactPhone: "01700000002",
    pickupAddress: "House 45, Road 7, Sector 3, Uttara, Dhaka 1230",
    status: MerchantStatus.ACTIVE,
  },
  {
    userEmail: "merchant2@dhruto.com",
    businessName: "Ananya Fashion & Crafts",
    contactPhone: "01700000012",
    pickupAddress: "Suite 4B, Concord Royal Court, Dhanmondi 27, Dhaka 1209",
    status: MerchantStatus.ACTIVE,
  },
  {
    userEmail: "merchant3@dhruto.com",
    businessName: "Star Tech Express Gadgets",
    contactPhone: "01700000013",
    pickupAddress: "Level 5, Multiplan Center, Elephant Road, Dhaka 1205",
    status: MerchantStatus.ACTIVE,
  },
];
