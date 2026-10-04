import { z } from "zod";

export enum NotificationChannel {
  IN_APP = "IN_APP",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

export enum NotificationType {
  PARCEL_STATUS_UPDATE = "PARCEL_STATUS_UPDATE",
  DELIVERY_OTP = "DELIVERY_OTP",
  CASH_COLLECTED = "CASH_COLLECTED",
  PAYOUT_UPDATE = "PAYOUT_UPDATE",
  SYSTEM = "SYSTEM",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  READ = "READ",
}

export const createNotificationSchema = z.object({
  merchantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  channel: z.nativeEnum(NotificationChannel),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required").max(255),
  message: z.string().min(1, "Message is required"),
  recipientTarget: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;

export interface NotificationItem {
  id: string;
  merchantId?: string;
  userId?: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message: string;
  recipientTarget?: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
}
