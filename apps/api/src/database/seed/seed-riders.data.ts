import { RiderStatus } from '../entities/Rider.entity.js';

export interface SeedRiderData {
  userEmail: string;
  hubCode: string;
  status: RiderStatus;
}

export const SEED_RIDERS: SeedRiderData[] = [
  {
    userEmail: 'rider@dhruto.com',
    hubCode: 'HUB-DHK-01',
    status: RiderStatus.ON_DUTY,
  },
  {
    userEmail: 'rider2@dhruto.com',
    hubCode: 'HUB-DHK-01',
    status: RiderStatus.ON_DUTY,
  },
  {
    userEmail: 'rider3@dhruto.com',
    hubCode: 'HUB-CTG-01',
    status: RiderStatus.ACTIVE,
  },
];
