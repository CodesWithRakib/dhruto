import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Dhruto — baseline schema (Phase 0 foundation + Phase 1 parcel core).
 *
 * Generated from the TypeORM entity metadata, then made idempotent so it can be
 * applied to a fresh database or safely re-run against a database whose schema
 * was previously created by TypeORM `synchronize` during Phase 0.
 *
 * Down: drops every Dhruto table and enum type (development only).
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = "InitialSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'users_role_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'MERCHANT', 'RIDER', 'HUB_MANAGER', 'CUSTOMER');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'users_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'MERCHANT', "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'merchants_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."merchants_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "business_name" character varying(255) NOT NULL, "contact_phone" character varying(20) NOT NULL, "status" "public"."merchants_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION', "pickup_address" text NOT NULL, CONSTRAINT "REL_698f612a3134c503f711479a4e" UNIQUE ("user_id"), CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "webhook_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "merchant_id" uuid NOT NULL, "url" character varying(500) NOT NULL, "secret" character varying(255) NOT NULL, "events" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "description" character varying(255), "failure_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_bf631ae77d39849d599817fb6f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7168740cff228d95930428d1bc" ON "webhook_subscriptions" ("merchant_id")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'webhook_deliveries_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."webhook_deliveries_status_enum" AS ENUM('PENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "webhook_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscription_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "event" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "signature" character varying(255) NOT NULL, "status_code" integer, "response_body" text, "status" "public"."webhook_deliveries_status_enum" NOT NULL DEFAULT 'PENDING', "attempt_count" integer NOT NULL DEFAULT '1', "next_retry_at" TIMESTAMP WITH TIME ZONE, "last_attempt_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_535dd409947fb6d8fc6dfc0112a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_171531df2750490b9c18f197ee" ON "webhook_deliveries" ("merchant_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_eacd4d00fc59447f435cefcc58" ON "webhook_deliveries" ("subscription_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "merchant_id" uuid NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "pending_balance" numeric(12,2) NOT NULL DEFAULT '0', "withdrawn_total" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'BDT', "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_64c3c9dd2323f27efbe86f4a961" UNIQUE ("merchant_id"), CONSTRAINT "REL_64c3c9dd2323f27efbe86f4a96" UNIQUE ("merchant_id"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'wallet_transactions_type_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."wallet_transactions_type_enum" AS ENUM('COD_CREDIT', 'DELIVERY_FEE', 'RETURN_FEE', 'PAYOUT_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "wallet_id" uuid NOT NULL, "type" "public"."wallet_transactions_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "balance_after" numeric(12,2) NOT NULL, "reference_type" character varying(50), "reference_id" character varying(100), "description" text, CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e3ac3b5ed7e3475ab13a5cda4c" ON "wallet_transactions" ("reference_type", "reference_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f297fd7508a3c4bff98fb9e1d6" ON "wallet_transactions" ("wallet_id", "createdAt")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'hubs_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."hubs_status_enum" AS ENUM('ACTIVE', 'INACTIVE');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hubs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "district_id" uuid, "thana_id" uuid, "address" text NOT NULL, "status" "public"."hubs_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_a5b22a077572b2ebcff8be166e2" UNIQUE ("code"), CONSTRAINT "PK_44b53d1f2b4568b26ce4710b843" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'riders_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."riders_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'ON_DUTY', 'OFF_DUTY');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "riders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "hub_id" uuid NOT NULL, "status" "public"."riders_status_enum" NOT NULL DEFAULT 'ACTIVE', "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6c17e67f760677500c29d68e689" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'parcels_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."parcels_status_enum" AS ENUM('CREATED', 'PICKUP_REQUESTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'ORIGIN_HUB_RECEIVED', 'BAGGED', 'IN_TRANSIT', 'DESTINATION_HUB_RECEIVED', 'ASSIGNED_TO_RIDER', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'RESCHEDULED', 'DELIVERED', 'CASH_PENDING', 'CASH_VERIFIED', 'RTO_INITIATED', 'RETURN_IN_TRANSIT', 'RETURNED_TO_MERCHANT', 'CANCELLED', 'LOST', 'DAMAGED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "parcels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tracking_code" character varying(50) NOT NULL, "merchant_id" uuid NOT NULL, "current_rider_id" uuid, "current_hub_id" uuid, "recipient_name" character varying(255) NOT NULL, "parcel_description" character varying(500), "recipient_phone" character varying(20) NOT NULL, "raw_address" text NOT NULL, "district" character varying(100), "thana" character varying(100), "normalized_address" jsonb, "weight" numeric(12,2) NOT NULL DEFAULT '0', "cod_amount" numeric(12,2) NOT NULL DEFAULT '0', "delivery_fee" numeric(12,2) NOT NULL DEFAULT '0', "delivery_otp" character varying(10), "status" "public"."parcels_status_enum" NOT NULL DEFAULT 'CREATED', CONSTRAINT "UQ_4225843afe07879602c9a7c0d3f" UNIQUE ("tracking_code"), CONSTRAINT "PK_47847f79fee8a3926f2b3022a96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f46a24eaeb63cd29881a4d78a3" ON "parcels" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_66b4fb76cca4c993138e478d19" ON "parcels" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4740d26c62da4be22b4e4c55a4" ON "parcels" ("recipient_phone")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8493e84631cab23682b27f2696" ON "parcels" ("current_rider_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b65dee577687a42378e02ecd53" ON "parcels" ("current_hub_id", "status")`,
    );
    // NOTE: the two Phase 1 parcel list indexes (merchant_id/createdAt and
    // merchant_id/district) are created by ReconcilePhase0Schema, which runs
    // after this migration and is therefore safe on both fresh and legacy
    // databases where `parcels.district` may not exist yet.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_668f25ec1b47c2086d4e4872aa" ON "parcels" ("merchant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "parcel_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "parcel_id" uuid NOT NULL, "rider_id" uuid NOT NULL, "assigned_by" uuid NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "unassigned_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_36d5183e18f4bb9b3b7be00a3d4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payout_requests_payout_method_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."payout_requests_payout_method_enum" AS ENUM('BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payout_requests_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."payout_requests_status_enum" AS ENUM('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "payout_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "merchant_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "payout_method" "public"."payout_requests_payout_method_enum" NOT NULL, "account_details" jsonb NOT NULL, "status" "public"."payout_requests_status_enum" NOT NULL DEFAULT 'REQUESTED', "processed_by" uuid, "processed_at" TIMESTAMP WITH TIME ZONE, "transaction_reference" character varying(100), "rejection_reason" text, "notes" text, CONSTRAINT "PK_3a6acb302f56ad7dadda35c86b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'parcel_status_histories_from_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."parcel_status_histories_from_status_enum" AS ENUM('CREATED', 'PICKUP_REQUESTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'ORIGIN_HUB_RECEIVED', 'BAGGED', 'IN_TRANSIT', 'DESTINATION_HUB_RECEIVED', 'ASSIGNED_TO_RIDER', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'RESCHEDULED', 'DELIVERED', 'CASH_PENDING', 'CASH_VERIFIED', 'RTO_INITIATED', 'RETURN_IN_TRANSIT', 'RETURNED_TO_MERCHANT', 'CANCELLED', 'LOST', 'DAMAGED');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'parcel_status_histories_to_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."parcel_status_histories_to_status_enum" AS ENUM('CREATED', 'PICKUP_REQUESTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'ORIGIN_HUB_RECEIVED', 'BAGGED', 'IN_TRANSIT', 'DESTINATION_HUB_RECEIVED', 'ASSIGNED_TO_RIDER', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'RESCHEDULED', 'DELIVERED', 'CASH_PENDING', 'CASH_VERIFIED', 'RTO_INITIATED', 'RETURN_IN_TRANSIT', 'RETURNED_TO_MERCHANT', 'CANCELLED', 'LOST', 'DAMAGED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "parcel_status_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "parcel_id" uuid NOT NULL, "from_status" "public"."parcel_status_histories_from_status_enum", "to_status" "public"."parcel_status_histories_to_status_enum" NOT NULL, "event_type" character varying(50) NOT NULL DEFAULT 'STATUS_CHANGED', "actor_id" uuid, "actor_role" character varying(50) NOT NULL, "description" text, "metadata" jsonb, CONSTRAINT "PK_1bb129f2ab69f4418192d4350d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_076a51d3e7bafa6daad0ce1869" ON "parcel_status_histories" ("to_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_33f97a9c53955a85c5eaed5295" ON "parcel_status_histories" ("parcel_id", "createdAt")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'notifications_channel_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."notifications_channel_enum" AS ENUM('IN_APP', 'SMS', 'EMAIL');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'notifications_type_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."notifications_type_enum" AS ENUM('PARCEL_STATUS_UPDATE', 'DELIVERY_OTP', 'CASH_COLLECTED', 'PAYOUT_UPDATE', 'SYSTEM');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'notifications_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."notifications_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED', 'READ');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "merchant_id" uuid, "user_id" uuid, "channel" "public"."notifications_channel_enum" NOT NULL DEFAULT 'IN_APP', "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'PARCEL_STATUS_UPDATE', "title" character varying(255) NOT NULL, "message" text NOT NULL, "recipient_target" character varying(255), "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'SENT', "metadata" jsonb, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "read_at" TIMESTAMP WITH TIME ZONE, "failure_reason" text, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f8119e95a07eeea356486ed134" ON "notifications" ("user_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dd2bb63babab173a4513bd18d0" ON "notifications" ("merchant_id", "createdAt")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'manifests_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."manifests_status_enum" AS ENUM('CREATED', 'DISPATCHED', 'RECEIVED', 'RECONCILED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "manifests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "manifest_code" character varying(50) NOT NULL, "origin_hub_id" uuid NOT NULL, "destination_hub_id" uuid NOT NULL, "status" "public"."manifests_status_enum" NOT NULL DEFAULT 'CREATED', "vehicle_number" character varying(100) NOT NULL, "driver_name" character varying(150) NOT NULL, "driver_phone" character varying(20) NOT NULL, "bag_ids" jsonb NOT NULL DEFAULT '[]', "dispatched_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_5618dab437bf7588bb43826ab16" UNIQUE ("manifest_code"), CONSTRAINT "PK_fb41b22d800467667616837784b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'cash_ledgers_hand_in_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."cash_ledgers_hand_in_status_enum" AS ENUM('PENDING', 'HANDED_IN', 'VERIFIED', 'DISCREPANCY');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "cash_ledgers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "parcel_id" uuid NOT NULL, "rider_id" uuid NOT NULL, "hub_id" uuid, "amount" numeric(12,2) NOT NULL, "collected_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "hand_in_status" "public"."cash_ledgers_hand_in_status_enum" NOT NULL DEFAULT 'PENDING', "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_1f6f23601eeb83820f2d2183804" UNIQUE ("parcel_id"), CONSTRAINT "PK_8e6a11ee2d0cb4e128cf78a8958" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_681da848e80563d766f4633b14" ON "cash_ledgers" ("collected_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d9d777d4635ceca185b94b8bec" ON "cash_ledgers" ("hub_id", "hand_in_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_38c4b6b72893b14158df07c15d" ON "cash_ledgers" ("rider_id", "hand_in_status")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "idempotency_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" character varying(128) NOT NULL, "scope" character varying(64) NOT NULL DEFAULT 'DEFAULT', "user_id" uuid, "request_hash" character varying(64), "status_code" integer, "response" jsonb, "completed_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9ae4e93699362b0d4e3da3dd1c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9c03b6adebf385ca991d085063" ON "idempotency_records" ("key", "scope")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'bags_status_enum' AND n.nspname = 'public') THEN
        CREATE TYPE "public"."bags_status_enum" AS ENUM('OPEN', 'SEALED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED');
      END IF;
    END $$;`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "bags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "bag_code" character varying(50) NOT NULL, "origin_hub_id" uuid NOT NULL, "destination_hub_id" uuid NOT NULL, "status" "public"."bags_status_enum" NOT NULL DEFAULT 'OPEN', "seal_tag" character varying(100), "sealed_at" TIMESTAMP WITH TIME ZONE, "dispatched_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_01a71554d9f2e44f4702f39e871" UNIQUE ("bag_code"), CONSTRAINT "PK_8ea1bfb4f475f35d6cffd0966ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "bag_parcels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "bag_id" uuid NOT NULL, "parcel_id" uuid NOT NULL, CONSTRAINT "PK_4ee9e8cae34fec5a6ad27168ed5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ccdeebefc7a7ab6e4f224589b4" ON "bag_parcels" ("bag_id", "parcel_id")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_698f612a3134c503f711479a4e5') THEN
        ALTER TABLE "merchants" ADD CONSTRAINT "FK_698f612a3134c503f711479a4e5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7168740cff228d95930428d1bc4') THEN
        ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "FK_7168740cff228d95930428d1bc4" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_23eb2b6ae801c52cfb79a556b8a') THEN
        ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "FK_23eb2b6ae801c52cfb79a556b8a" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_64c3c9dd2323f27efbe86f4a961') THEN
        ALTER TABLE "wallets" ADD CONSTRAINT "FK_64c3c9dd2323f27efbe86f4a961" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c57d19129968160f4db28fc8b28') THEN
        ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8d3d41e9ec12eff82b325fa8c07') THEN
        ALTER TABLE "riders" ADD CONSTRAINT "FK_8d3d41e9ec12eff82b325fa8c07" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_3b76d47a57c06bd04edfe99b629') THEN
        ALTER TABLE "riders" ADD CONSTRAINT "FK_3b76d47a57c06bd04edfe99b629" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_84d3757f0e4a20f86842a05a0a2') THEN
        ALTER TABLE "parcels" ADD CONSTRAINT "FK_84d3757f0e4a20f86842a05a0a2" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_0b1038d06dc742dfeb74c148a0e') THEN
        ALTER TABLE "parcels" ADD CONSTRAINT "FK_0b1038d06dc742dfeb74c148a0e" FOREIGN KEY ("current_rider_id") REFERENCES "riders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_df32d27847d05ab0b991075a0b6') THEN
        ALTER TABLE "parcels" ADD CONSTRAINT "FK_df32d27847d05ab0b991075a0b6" FOREIGN KEY ("current_hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_5cd238aa2f8cb59b8a9f457e21c') THEN
        ALTER TABLE "parcel_assignments" ADD CONSTRAINT "FK_5cd238aa2f8cb59b8a9f457e21c" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8e7633c7f908b77e61a45ecf857') THEN
        ALTER TABLE "parcel_assignments" ADD CONSTRAINT "FK_8e7633c7f908b77e61a45ecf857" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_3179eb6a30c74ca38fbd4e8e47a') THEN
        ALTER TABLE "payout_requests" ADD CONSTRAINT "FK_3179eb6a30c74ca38fbd4e8e47a" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_0a9fab16f4dc03c7a675d32ba85') THEN
        ALTER TABLE "payout_requests" ADD CONSTRAINT "FK_0a9fab16f4dc03c7a675d32ba85" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_29462c181ed24ffea197415365c') THEN
        ALTER TABLE "parcel_status_histories" ADD CONSTRAINT "FK_29462c181ed24ffea197415365c" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bc9b909dcfd2c2b41ac18798cd6') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "FK_bc9b909dcfd2c2b41ac18798cd6" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_9a8a82462cab47c73d25f49261f') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_a2684f0dd51d36a035803ebee0a') THEN
        ALTER TABLE "manifests" ADD CONSTRAINT "FK_a2684f0dd51d36a035803ebee0a" FOREIGN KEY ("origin_hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_9a4ee3fbbb2a176d70da7f6a9aa') THEN
        ALTER TABLE "manifests" ADD CONSTRAINT "FK_9a4ee3fbbb2a176d70da7f6a9aa" FOREIGN KEY ("destination_hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_1f6f23601eeb83820f2d2183804') THEN
        ALTER TABLE "cash_ledgers" ADD CONSTRAINT "FK_1f6f23601eeb83820f2d2183804" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6d6ca889e7d578c92b80f1cbf4b') THEN
        ALTER TABLE "cash_ledgers" ADD CONSTRAINT "FK_6d6ca889e7d578c92b80f1cbf4b" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_55171cff336d44d27dd142da80a') THEN
        ALTER TABLE "cash_ledgers" ADD CONSTRAINT "FK_55171cff336d44d27dd142da80a" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_39917c83c1cfab0ed78c5f96070') THEN
        ALTER TABLE "bags" ADD CONSTRAINT "FK_39917c83c1cfab0ed78c5f96070" FOREIGN KEY ("origin_hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_a9ed3384d9a289fddfb8f390e27') THEN
        ALTER TABLE "bags" ADD CONSTRAINT "FK_a9ed3384d9a289fddfb8f390e27" FOREIGN KEY ("destination_hub_id") REFERENCES "hubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_063f1c9b6e7e849dcec08ccd0e4') THEN
        ALTER TABLE "bag_parcels" ADD CONSTRAINT "FK_063f1c9b6e7e849dcec08ccd0e4" FOREIGN KEY ("bag_id") REFERENCES "bags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_b52b6d04e515b2568c31fcea0e7') THEN
        ALTER TABLE "bag_parcels" ADD CONSTRAINT "FK_b52b6d04e515b2568c31fcea0e7" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping in reverse dependency order is unnecessary because of CASCADE.
    const tables = [
      "bag_parcels",
      "bags",
      "manifests",
      "cash_ledgers",
      "parcel_assignments",
      "parcel_status_histories",
      "payout_requests",
      "wallet_transactions",
      "wallets",
      "notifications",
      "webhook_deliveries",
      "webhook_subscriptions",
      "parcels",
      "riders",
      "hubs",
      "merchants",
      "users",
      "idempotency_records",
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    const types = [
      "users_role_enum",
      "users_status_enum",
      "merchants_status_enum",
      "webhook_deliveries_status_enum",
      "wallet_transactions_type_enum",
      "hubs_status_enum",
      "riders_status_enum",
      "parcels_status_enum",
      "payout_requests_payout_method_enum",
      "payout_requests_status_enum",
      "parcel_status_histories_from_status_enum",
      "parcel_status_histories_to_status_enum",
      "notifications_channel_enum",
      "notifications_type_enum",
      "notifications_status_enum",
      "manifests_status_enum",
      "cash_ledgers_hand_in_status_enum",
      "bags_status_enum",
    ];
    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."${type}" CASCADE`);
    }
  }
}
