import { NotificationChannel, NotificationType } from '@dhruto/contracts';

export interface SeedNotificationData {
  merchantEmail: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  hoursAgo: number;
}

export const SEED_NOTIFICATIONS: SeedNotificationData[] = [
  {
    merchantEmail: 'merchant@dhruto.com',
    channel: NotificationChannel.IN_APP,
    type: NotificationType.PARCEL_STATUS_UPDATE,
    title: 'Parcel Delivered Successfully',
    message: 'Parcel DHR-2610-00101 has been delivered to Tanvir Ahmed in Dhanmondi. COD of ৳1,850 credited to pending balance.',
    isRead: true,
    hoursAgo: 40,
  },
  {
    merchantEmail: 'merchant@dhruto.com',
    channel: NotificationChannel.IN_APP,
    type: NotificationType.PARCEL_STATUS_UPDATE,
    title: 'Parcel Delivered Successfully',
    message: 'Parcel DHR-2610-00102 has been delivered to Nusrat Jahan in Gulshan. COD of ৳2,450 credited to pending balance.',
    isRead: true,
    hoursAgo: 38,
  },
  {
    merchantEmail: 'merchant@dhruto.com',
    channel: NotificationChannel.IN_APP,
    type: NotificationType.PAYOUT_UPDATE,
    title: 'Payout Disbursed',
    message: 'Your payout of ৳25,000 has been sent to your bKash merchant wallet.',
    isRead: false,
    hoursAgo: 30,
  },
  {
    merchantEmail: 'merchant@dhruto.com',
    channel: NotificationChannel.IN_APP,
    type: NotificationType.PARCEL_STATUS_UPDATE,
    title: 'Parcel Out for Delivery',
    message: 'Parcel DHR-2610-00107 is out for delivery with Karim Rider.',
    isRead: false,
    hoursAgo: 12,
  },
  {
    merchantEmail: 'merchant@dhruto.com',
    channel: NotificationChannel.IN_APP,
    type: NotificationType.PARCEL_STATUS_UPDATE,
    title: 'Shipment Sorted at Central Hub',
    message: 'Parcel DHR-2610-00115 arrived at Dhaka Central Sorting Hub.',
    isRead: false,
    hoursAgo: 8,
  },
];
