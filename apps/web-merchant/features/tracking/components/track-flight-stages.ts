import React from "react";
import {
  Radio,
  Truck,
  CheckCircle2,
  Building2,
  ShieldCheck,
} from "lucide-react";

export interface FlightStage {
  id: number;
  step: string;
  title: string;
  sub: string;
  hub: string;
  coords: string;
  speed: string;
  seal: string;
  eta: string;
  icon: React.ComponentType<{ className?: string }>;
  logs: string[];
}

export const FLIGHT_STAGES: FlightStage[] = [
  {
    id: 1,
    step: "01",
    title: "Order Inbound & Cross-Dock",
    sub: "Merchant Tejgaon Warehouse",
    hub: "Tejgaon Inbound Gateway",
    coords: "23.7594° N, 90.3908° E",
    speed: "0 km/h (Docked)",
    seal: "RFID-GEN-9901",
    eta: "Processed in 12m",
    icon: CheckCircle2,
    logs: [
      "[09:12:04] API_TRIGGER: Webhook order booked via merchant API",
      "[09:12:15] INBOUND_CONVEYOR: Dimension 24x18x12cm, 1.4kg verified",
      "[09:12:28] BARCODE_PRINT: Thermal 4x6 label generated with cryptographic hash",
    ],
  },
  {
    id: 2,
    step: "02",
    title: "Central Sorting & Bagging",
    sub: "Dhaka Central Mega-Hub",
    hub: "Dhaka Central Hub, Bay 04",
    coords: "23.8103° N, 90.4125° E",
    speed: "18 km/h (Belt sort)",
    seal: "SEAL-BAG-88402",
    eta: "Cross-docked in 24m",
    icon: Building2,
    logs: [
      "[11:45:10] OPTICAL_SORT: Laser barcode scanner decoded in 140ms",
      "[11:45:22] CHUTE_DISPATCH: Assigned to Chittagong Line-Haul Chute #07",
      "[11:46:01] BAGGED_MANIFEST: Sealed in tamper-evident security bag #BG-4091",
    ],
  },
  {
    id: 3,
    step: "03",
    title: "Inter-District Line-Haul",
    sub: "N1 National Highway Transit",
    hub: "En-Route (Comilla Bypass)",
    coords: "23.4682° N, 91.1788° E",
    speed: "68 km/h (Highway)",
    seal: "GPS-LOCKED-04",
    eta: "02h 45m to CTG Gate",
    icon: Truck,
    logs: [
      "[14:20:18] TOLL_GATEWAY: Meghnabridge RFID automated clearance",
      "[15:10:44] TELEMETRY_PING: GPS Coordinates locked, speed steady at 68 km/h",
      "[15:45:12] SENSOR_CHECK: Cargo compartment temperature 24°C, shocks 0.0g",
    ],
  },
  {
    id: 4,
    step: "04",
    title: "Last-Mile Rider Dispatch",
    sub: "Agrabad Regional Distribution",
    hub: "Agrabad Local Sorting Hub",
    coords: "22.3384° N, 91.8317° E",
    speed: "24 km/h (EV Van)",
    seal: "RIDER-ASSIGN-77",
    eta: "Out for delivery with rider",
    icon: Radio,
    logs: [
      "[08:30:02] DESTINATION_ARRIVAL: Inbound scan at Agrabad Hub Chittagong",
      "[09:15:19] RIDER_HANDOVER: Manifest signed by Rider Tanvir (ID: R-408)",
      "[09:30:45] SMS_DISPATCH: Customer notified of today's delivery window",
    ],
  },
  {
    id: 5,
    step: "05",
    title: "Biometric OTP Handover",
    sub: "Customer Doorstep Delivery",
    hub: "Destination Customer Address",
    coords: "22.3569° N, 91.7832° E",
    speed: "0 km/h (At door)",
    seal: "VERIFIED-DELIVERED",
    eta: "Delivered & COD Settled",
    icon: ShieldCheck,
    logs: [
      "[11:05:12] GEO_PROXIMITY: Rider within 50 meters of delivery location",
      "[11:06:40] OTP_SUBMITTED: 4-digit customer SMS OTP validated successfully",
      "[11:07:05] ESCROW_RELEASE: COD collection recorded in merchant instant ledger",
    ],
  },
];
