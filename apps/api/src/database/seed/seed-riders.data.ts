import { RiderStatus } from "../entities/Rider.entity.js";

export interface SeedRiderData {
  userEmail: string;
  hubCode: string;
  status: RiderStatus;
  riderCode: string;
}

export const SEED_RIDERS: SeedRiderData[] = [
  {
    userEmail: "rider@dhruto.com",
    hubCode: "HUB-DHK-01",
    status: RiderStatus.ON_DUTY,
    riderCode: "RDR-000001",
  },
  {
    userEmail: "rider2@dhruto.com",
    hubCode: "HUB-DHK-01",
    status: RiderStatus.ON_DUTY,
    riderCode: "RDR-000002",
  },
  {
    userEmail: "rider3@dhruto.com",
    hubCode: "HUB-CTG-01",
    status: RiderStatus.ACTIVE,
    riderCode: "RDR-000003",
  },
];
