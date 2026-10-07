import { WebhookEvent } from '@dhruto/contracts';

export interface SeedWebhookSubscriptionData {
  merchantEmail: string;
  url: string;
  events: string[];
  status: string;
  description: string;
}

/**
 * Deterministic webhook fixtures. The example subscription is INACTIVE so
 * seeded environments never POST to external endpoints on their own; the
 * secret below is a non-functional placeholder replaced on rotation.
 */
export const SEED_WEBHOOK_SUBSCRIPTIONS: SeedWebhookSubscriptionData[] = [
  {
    merchantEmail: 'merchant@dhruto.com',
    url: 'https://example.com/dhruto-webhooks/orders',
    events: [
      WebhookEvent.PARCEL_CREATED,
      WebhookEvent.PARCEL_DELIVERED,
      WebhookEvent.CASH_VERIFIED,
      WebhookEvent.PAYOUT_COMPLETED,
    ],
    status: 'INACTIVE',
    description: 'Example order-sync endpoint (inactive by default)',
  },
];
