import { HubPermission, HubType } from "@dhruto/contracts";
import { HubStatus } from "../entities/Hub.entity.js";

export interface SeedHubData {
  code: string;
  name: string;
  type: HubType;
  district: string;
  thana: string;
  address: string;
  districtId?: string;
  thanaId?: string;
  status: HubStatus;
}

export const SEED_HUBS: SeedHubData[] = [
  {
    code: "HUB-DHK-01",
    name: "Dhaka Central Sorting Hub",
    type: HubType.SORTING,
    district: "Dhaka",
    thana: "Tejgaon",
    address: "Tejgaon Industrial Area, Shaheed Tajuddin Ahmad Sarani, Dhaka 1208",
    status: HubStatus.ACTIVE,
  },
  {
    code: "HUB-CTG-01",
    name: "Chittagong Regional Hub",
    type: HubType.REGIONAL,
    district: "Chittagong",
    thana: "Panchlaish",
    address: "GEC Circle, Nasirabad, Chittagong 4000",
    status: HubStatus.ACTIVE,
  },
  {
    code: "HUB-SYL-01",
    name: "Sylhet Metropolitan Hub",
    type: HubType.DESTINATION,
    district: "Sylhet",
    thana: "Zindabazar",
    address: "Zindabazar Point, East Zindabazar, Sylhet 3100",
    status: HubStatus.ACTIVE,
  },
  {
    code: "HUB-RAJ-01",
    name: "Rajshahi Divisional Hub",
    type: HubType.DESTINATION,
    district: "Rajshahi",
    thana: "Boalia",
    address: "Shaheb Bazar, Station Road, Rajshahi 6000",
    status: HubStatus.ACTIVE,
  },
  {
    code: "HUB-KHU-01",
    name: "Khulna Logistics Center",
    type: HubType.DESTINATION,
    district: "Khulna",
    thana: "Khalishpur",
    address: "Shibbari More, KDA Avenue, Khulna 9100",
    status: HubStatus.ACTIVE,
  },
];

/**
 * Every hub permission a hub operator legitimately holds. Seed operators get
 * the full set for their hub so the operational workflow is exercisable
 * end-to-end in development.
 */
const ALL_HUB_PERMISSIONS: HubPermission[] = Object.values(HubPermission);

export interface SeedHubAssignmentData {
  userEmail: string;
  hubCode: string;
  permissions: HubPermission[];
}

/**
 * Hub authorization is never derived from a role alone: an operator must hold an
 * explicit assignment for the hub. These assignments are what make the seeded
 * hub managers able to operate, and what keeps them out of each other's hubs.
 */
export const SEED_HUB_ASSIGNMENTS: SeedHubAssignmentData[] = [
  {
    userEmail: "hubmanager@dhruto.com",
    hubCode: "HUB-DHK-01",
    permissions: ALL_HUB_PERMISSIONS,
  },
  {
    userEmail: "hubmanager_ctg@dhruto.com",
    hubCode: "HUB-CTG-01",
    permissions: ALL_HUB_PERMISSIONS,
  },
];
