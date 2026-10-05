import { HubStatus } from '../entities/Hub.entity.js';

export interface SeedHubData {
  code: string;
  name: string;
  address: string;
  districtId?: string;
  thanaId?: string;
  status: HubStatus;
}

export const SEED_HUBS: SeedHubData[] = [
  {
    code: 'HUB-DHK-01',
    name: 'Dhaka Central Sorting Hub',
    address: 'Tejgaon Industrial Area, Shaheed Tajuddin Ahmad Sarani, Dhaka 1208',
    status: HubStatus.ACTIVE,
  },
  {
    code: 'HUB-CTG-01',
    name: 'Chittagong Regional Hub',
    address: 'GEC Circle, Nasirabad, Chittagong 4000',
    status: HubStatus.ACTIVE,
  },
  {
    code: 'HUB-SYL-01',
    name: 'Sylhet Metropolitan Hub',
    address: 'Zindabazar Point, East Zindabazar, Sylhet 3100',
    status: HubStatus.ACTIVE,
  },
  {
    code: 'HUB-RAJ-01',
    name: 'Rajshahi Divisional Hub',
    address: 'Shaheb Bazar, Station Road, Rajshahi 6000',
    status: HubStatus.ACTIVE,
  },
  {
    code: 'HUB-KHU-01',
    name: 'Khulna Logistics Center',
    address: 'Shibbari More, KDA Avenue, Khulna 9100',
    status: HubStatus.ACTIVE,
  },
];
