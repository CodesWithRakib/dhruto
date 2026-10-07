import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Phase 5 - Notifications, webhooks, queues and integrations.
 *
 * Adds the transactional outbox, notification preferences, delivery
 * bookkeeping on notifications (event link, dedup key, provider receipt,
 * attempts, template, locale) and the dead-letter table. All statements are
 * idempotent.
 */
export class Phase5NotificationsIntegrations1700000000006 implements MigrationInterface {
  name = 'Phase5NotificationsIntegrations1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'event_outbox_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."event_outbox_status_enum" AS ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'notification_preferences_category_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."notification_preferences_category_enum" AS ENUM('PARCEL_UPDATES', 'FINANCIAL_UPDATES', 'SECURITY_ALERTS');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'notification_preferences_channel_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."notification_preferences_channel_enum" AS ENUM('IN_APP', 'SMS', 'EMAIL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'integration_failures_kind_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."integration_failures_kind_enum" AS ENUM('WEBHOOK', 'SMS', 'EMAIL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'integration_failures_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."integration_failures_status_enum" AS ENUM('OPEN', 'REPLAYED', 'RESOLVED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "event_id" uuid NOT NULL,
        "event_type" character varying(100) NOT NULL,
        "aggregate_type" character varying(64) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "request_id" character varying(128),
        "actor_id" uuid,
        "payload" jsonb NOT NULL,
        "status" "public"."event_outbox_status_enum" NOT NULL DEFAULT 'PENDING',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "available_at" timestamptz NOT NULL DEFAULT now(),
        "published_at" timestamptz,
        "last_error" text,
        CONSTRAINT "PK_event_outbox" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_outbox_event" UNIQUE ("event_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_event_outbox_status_available"
        ON "event_outbox" ("status", "available_at");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_event_outbox_aggregate"
        ON "event_outbox" ("aggregate_type", "aggregate_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "user_id" uuid,
        "merchant_id" uuid,
        "category" "public"."notification_preferences_category_enum" NOT NULL,
        "channel" "public"."notification_preferences_channel_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "locale" character varying(5) NOT NULL DEFAULT 'en',
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notification_preferences_user"
        ON "notification_preferences" ("user_id", "channel", "category") WHERE "user_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notification_preferences_merchant"
        ON "notification_preferences" ("merchant_id", "channel", "category") WHERE "merchant_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "event_id" uuid,
        ADD COLUMN IF NOT EXISTS "dedupe_key" character varying(255),
        ADD COLUMN IF NOT EXISTS "provider_message_id" character varying(128),
        ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "template_key" character varying(100),
        ADD COLUMN IF NOT EXISTS "locale" character varying(5) NOT NULL DEFAULT 'en';
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notifications_dedupe"
        ON "notifications" ("dedupe_key") WHERE "dedupe_key" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_event"
        ON "notifications" ("event_id") WHERE "event_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_failures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "job_id" character varying(128) NOT NULL,
        "event_id" uuid,
        "queue" character varying(64) NOT NULL,
        "kind" "public"."integration_failures_kind_enum" NOT NULL,
        "reference_id" character varying(100),
        "merchant_id" uuid,
        "reason" text NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "status" "public"."integration_failures_status_enum" NOT NULL DEFAULT 'OPEN',
        "last_attempt_at" timestamptz,
        "resolved_by" uuid,
        "resolved_at" timestamptz,
        CONSTRAINT "PK_integration_failures" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_integration_failures_job" UNIQUE ("job_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_integration_failures_status_created"
        ON "integration_failures" ("status", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_integration_failures_queue_status"
        ON "integration_failures" ("queue", "status");
    `);

    // Webhook delivery event link for idempotent redelivery.
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
        ADD COLUMN IF NOT EXISTS "event_id" uuid;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_webhook_deliveries_subscription_event"
        ON "webhook_deliveries" ("subscription_id", "event_id")
        WHERE "event_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_webhook_deliveries_subscription_event";`);
    await queryRunner.query(`ALTER TABLE "webhook_deliveries" DROP COLUMN IF EXISTS "event_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_failures";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_event";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_notifications_dedupe";`);
    await queryRunner.query(`ALTER TABLE "notifications"
      DROP COLUMN IF EXISTS "locale",
      DROP COLUMN IF EXISTS "template_key",
      DROP COLUMN IF EXISTS "attempt_count",
      DROP COLUMN IF EXISTS "provider_message_id",
      DROP COLUMN IF EXISTS "dedupe_key",
      DROP COLUMN IF EXISTS "event_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_outbox";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."integration_failures_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."integration_failures_kind_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_preferences_channel_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_preferences_category_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."event_outbox_status_enum";`);
  }
}
