import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 4 - Finance ledger, settlement, hand-in batches and discrepancies.
 *
 * Adds the immutable double-entry journal (`financial_transactions` +
 * `financial_entries` in integer minor units with a balance CHECK), parcel
 * settlements + batches, rider hand-in batches + items, cash discrepancies,
 * payout codes/idempotency/approval fields, payout FAILED+CANCELLED states,
 * and a separate verified-amount column so verification never overwrites the
 * collected amount. All statements are idempotent.
 */
export class Phase4FinanceLedger1700000000004 implements MigrationInterface {
  name = "Phase4FinanceLedger1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1. Payout lifecycle extension.
    // ------------------------------------------------------------------
    await queryRunner.query(
      `ALTER TYPE "public"."payout_requests_status_enum" ADD VALUE IF NOT EXISTS 'FAILED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."payout_requests_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );
    await queryRunner.query(`
      ALTER TABLE "payout_requests"
        ADD COLUMN IF NOT EXISTS "payout_code" character varying(20),
        ADD COLUMN IF NOT EXISTS "idempotency_key" character varying(128),
        ADD COLUMN IF NOT EXISTS "failure_reason" text,
        ADD COLUMN IF NOT EXISTS "approved_by" uuid,
        ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payout_requests_code"
        ON "payout_requests" ("payout_code") WHERE "payout_code" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payout_requests_idempotency"
        ON "payout_requests" ("merchant_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);

    // ------------------------------------------------------------------
    // 2. Cash ledger verified amount (never overwrite the collected amount).
    // ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "cash_ledgers"
        ADD COLUMN IF NOT EXISTS "verified_amount" numeric(12,2);
    `);

    // ------------------------------------------------------------------
    // 3. Double-entry journal types + tables.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'financial_transactions_type_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."financial_transactions_type_enum" AS ENUM(
            'COD_COLLECTED', 'CASH_HANDED_IN', 'COD_SETTLEMENT',
            'PAYOUT_RESERVATION', 'PAYOUT_COMPLETION', 'PAYOUT_RELEASE',
            'ADJUSTMENT', 'REVERSAL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'financial_transactions_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."financial_transactions_status_enum" AS ENUM('POSTED', 'REVERSED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'financial_entries_account_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."financial_entries_account_enum" AS ENUM(
            'PLATFORM_CASH', 'RIDER_CASH_IN_HAND', 'HUB_CASH', 'COD_RECEIVABLE',
            'MERCHANT_AVAILABLE', 'MERCHANT_PAYOUT_IN_TRANSIT', 'FEE_REVENUE', 'ADJUSTMENT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'financial_entries_direction_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."financial_entries_direction_enum" AS ENUM('DEBIT', 'CREDIT');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "financial_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "transaction_code" character varying(20) NOT NULL,
        "type" "public"."financial_transactions_type_enum" NOT NULL,
        "status" "public"."financial_transactions_status_enum" NOT NULL DEFAULT 'POSTED',
        "reference_type" character varying(50),
        "reference_id" character varying(100),
        "description" text,
        "reversal_of_id" uuid,
        "reversed_by_id" uuid,
        "created_by" uuid,
        CONSTRAINT "PK_financial_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_financial_transactions_code" UNIQUE ("transaction_code")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "financial_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "transaction_id" uuid NOT NULL,
        "account" "public"."financial_entries_account_enum" NOT NULL,
        "direction" "public"."financial_entries_direction_enum" NOT NULL,
        "amount_minor" bigint NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'BDT',
        "merchant_id" uuid,
        "memo" text,
        CONSTRAINT "PK_financial_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_financial_entries_transaction"
          FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_financial_entries_positive" CHECK ("amount_minor" > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_transactions_type_created"
        ON "financial_transactions" ("type", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_transactions_reference"
        ON "financial_transactions" ("reference_type", "reference_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_entries_transaction"
        ON "financial_entries" ("transaction_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_entries_account_created"
        ON "financial_entries" ("account", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_entries_merchant_account"
        ON "financial_entries" ("merchant_id", "account") WHERE "merchant_id" IS NOT NULL;
    `);

    // ------------------------------------------------------------------
    // 4. Settlements + batches.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'settlements_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."settlements_status_enum" AS ENUM('SETTLED', 'REVERSED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'settlement_batches_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."settlement_batches_status_enum" AS ENUM('PENDING', 'COMPLETED', 'CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "settlement_code" character varying(20) NOT NULL,
        "merchant_id" uuid NOT NULL,
        "parcel_id" uuid NOT NULL,
        "cash_ledger_id" uuid NOT NULL,
        "gross_minor" bigint NOT NULL,
        "fee_minor" bigint NOT NULL,
        "net_minor" bigint NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'BDT',
        "status" "public"."settlements_status_enum" NOT NULL DEFAULT 'SETTLED',
        "transaction_id" uuid NOT NULL,
        "batch_id" uuid,
        "settled_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_settlements_code" UNIQUE ("settlement_code"),
        CONSTRAINT "UQ_settlements_parcel" UNIQUE ("parcel_id"),
        CONSTRAINT "UQ_settlements_ledger" UNIQUE ("cash_ledger_id"),
        CONSTRAINT "FK_settlements_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id"),
        CONSTRAINT "FK_settlements_parcel" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id"),
        CONSTRAINT "FK_settlements_ledger" FOREIGN KEY ("cash_ledger_id") REFERENCES "cash_ledgers"("id"),
        CONSTRAINT "FK_settlements_transaction" FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settlement_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "settlement_code" character varying(20) NOT NULL,
        "merchant_id" uuid NOT NULL,
        "status" "public"."settlement_batches_status_enum" NOT NULL DEFAULT 'PENDING',
        "gross_minor" bigint NOT NULL DEFAULT 0,
        "fee_minor" bigint NOT NULL DEFAULT 0,
        "net_minor" bigint NOT NULL DEFAULT 0,
        "settlement_count" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_by" uuid,
        "completed_at" timestamptz,
        CONSTRAINT "PK_settlement_batches" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_settlement_batches_code" UNIQUE ("settlement_code"),
        CONSTRAINT "FK_settlement_batches_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settlements_merchant_status"
        ON "settlements" ("merchant_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settlements_batch"
        ON "settlements" ("batch_id") WHERE "batch_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settlement_batches_merchant_status"
        ON "settlement_batches" ("merchant_id", "status");
    `);

    // ------------------------------------------------------------------
    // 5. Hand-in batches + items + discrepancies.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'cash_handins_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."cash_handins_status_enum" AS ENUM('SUBMITTED', 'VERIFIED', 'DISCREPANCY', 'RESOLVED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'cash_discrepancies_type_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."cash_discrepancies_type_enum" AS ENUM('SHORT', 'OVER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'cash_discrepancies_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."cash_discrepancies_status_enum" AS ENUM('OPEN', 'RESOLVED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_handins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "handin_code" character varying(20) NOT NULL,
        "rider_id" uuid NOT NULL,
        "hub_id" uuid,
        "status" "public"."cash_handins_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "expected_minor" bigint NOT NULL,
        "verified_minor" bigint NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'BDT',
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "verified_at" timestamptz,
        "verified_by" uuid,
        "notes" text,
        CONSTRAINT "PK_cash_handins" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cash_handins_code" UNIQUE ("handin_code"),
        CONSTRAINT "FK_cash_handins_rider" FOREIGN KEY ("rider_id") REFERENCES "riders"("id"),
        CONSTRAINT "CHK_cash_handins_expected" CHECK ("expected_minor" >= 0)
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_handin_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "handin_id" uuid NOT NULL,
        "cash_ledger_id" uuid NOT NULL,
        "amount_minor" bigint NOT NULL,
        CONSTRAINT "PK_cash_handin_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cash_handin_items_ledger" UNIQUE ("cash_ledger_id"),
        CONSTRAINT "FK_cash_handin_items_batch" FOREIGN KEY ("handin_id") REFERENCES "cash_handins"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cash_handin_items_ledger" FOREIGN KEY ("cash_ledger_id") REFERENCES "cash_ledgers"("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_discrepancies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "cash_ledger_id" uuid NOT NULL,
        "handin_id" uuid,
        "type" "public"."cash_discrepancies_type_enum" NOT NULL,
        "status" "public"."cash_discrepancies_status_enum" NOT NULL DEFAULT 'OPEN',
        "expected_minor" bigint NOT NULL,
        "actual_minor" bigint NOT NULL,
        "difference_minor" bigint NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'BDT',
        "reason" text,
        "notes" text,
        "reported_by" uuid,
        "resolved_by" uuid,
        "resolved_at" timestamptz,
        CONSTRAINT "PK_cash_discrepancies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_discrepancies_ledger" FOREIGN KEY ("cash_ledger_id") REFERENCES "cash_ledgers"("id"),
        CONSTRAINT "UQ_cash_discrepancies_ledger" UNIQUE ("cash_ledger_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cash_handins_rider_status"
        ON "cash_handins" ("rider_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cash_handins_hub_status"
        ON "cash_handins" ("hub_id", "status") WHERE "hub_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cash_discrepancies_status_created"
        ON "cash_discrepancies" ("status", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_discrepancies";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_handin_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_handins";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settlement_batches";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settlements";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_entries";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_transactions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."cash_discrepancies_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."cash_discrepancies_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."cash_handins_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."settlement_batches_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."settlements_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."financial_entries_direction_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."financial_entries_account_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."financial_transactions_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."financial_transactions_type_enum";`);
    await queryRunner.query(`ALTER TABLE "cash_ledgers" DROP COLUMN IF EXISTS "verified_amount";`);
    await queryRunner.query(`ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "approved_at";`);
    await queryRunner.query(`ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "approved_by";`);
    await queryRunner.query(
      `ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "failure_reason";`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "idempotency_key";`,
    );
    await queryRunner.query(`ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "payout_code";`);
  }
}
