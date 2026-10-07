import { UserRole, UserStatus } from "../entities/User.entity.js";

export interface SeedUserData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  notes?: string;
}

export const SEED_USERS: SeedUserData[] = [
  // Super Admin / Admin
  {
    name: "Dhruto System Admin",
    email: "admin@dhruto.com",
    phone: "01700000001",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    notes: "Platform super administrator with full system oversight",
  },
  // Merchants
  {
    name: "Rahim Uddin (Rahim Enterprise)",
    email: "merchant@dhruto.com",
    phone: "01700000002",
    role: UserRole.MERCHANT,
    status: UserStatus.ACTIVE,
    notes: "Primary merchant selling consumer goods and apparel",
  },
  {
    name: "Ananya Chowdhury (Ananya Fashion & Crafts)",
    email: "merchant2@dhruto.com",
    phone: "01700000012",
    role: UserRole.MERCHANT,
    status: UserStatus.ACTIVE,
    notes: "Boutique artisan and handicrafts merchant in Dhanmondi",
  },
  {
    name: "Tanvir Hossain (Star Tech Express Gadgets)",
    email: "merchant3@dhruto.com",
    phone: "01700000013",
    role: UserRole.MERCHANT,
    status: UserStatus.ACTIVE,
    notes: "High-volume electronics and smartphone accessories seller",
  },
  // Hub Managers
  {
    name: "Tareq Hub Manager (Dhaka Central)",
    email: "hubmanager@dhruto.com",
    phone: "01700000004",
    role: UserRole.HUB_MANAGER,
    status: UserStatus.ACTIVE,
    notes: "Operations lead for Tejgaon Central Sorting Facility",
  },
  {
    name: "Enamul Haque (Chittagong Hub Manager)",
    email: "hubmanager_ctg@dhruto.com",
    phone: "01700000014",
    role: UserRole.HUB_MANAGER,
    status: UserStatus.ACTIVE,
    notes: "Operations lead for Chittagong Regional Hub",
  },
  // Riders
  {
    name: "Karim Rider (Dhaka Central Fleet)",
    email: "rider@dhruto.com",
    phone: "01700000003",
    role: UserRole.RIDER,
    status: UserStatus.ACTIVE,
    notes: "Senior last-mile delivery rider assigned to Dhaka Central Hub",
  },
  {
    name: "Rafiqul Islam (Dhanmondi-Mirpur Route)",
    email: "rider2@dhruto.com",
    phone: "01700000023",
    role: UserRole.RIDER,
    status: UserStatus.ACTIVE,
    notes: "Express courier rider covering West Dhaka zones",
  },
  {
    name: "Jamil Ahmed (Chittagong GEC Route)",
    email: "rider3@dhruto.com",
    phone: "01700000033",
    role: UserRole.RIDER,
    status: UserStatus.ACTIVE,
    notes: "Last-mile dispatch rider in Chittagong metro",
  },
  // Customers
  {
    name: "Mahmudur Rahman",
    email: "customer@dhruto.com",
    phone: "01700000005",
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    notes: "Verified retail customer in Gulshan, Dhaka",
  },
  {
    name: "Nusrat Jahan",
    email: "customer2@dhruto.com",
    phone: "01700000015",
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    notes: "Frequent e-commerce shopper in Dhanmondi, Dhaka",
  },
];
