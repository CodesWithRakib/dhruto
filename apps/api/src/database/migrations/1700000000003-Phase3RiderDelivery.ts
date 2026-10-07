import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 3 - Rider Delivery.
 *
 * Hardens the delivery workflow on top of the Phase 1/2 parcel core:
 * human-readable rider codes, hashed delivery OTPs with expiry and attempt
 * limits (replacing the plaintext `parcels.delivery_otp` column), and an
 * append-only `delivery_attempts` log that doubles as the proof-of-delivery
 * record. No wallet or settlement columns are added here — Phase 4 owns them.
 *
 * Every statement is idempotent so the migration converges both fresh and
 * already-migrated databases.
 */
export class Phase3RiderDelivery1700000000003 implements MigrationInterface {
  name = "Phase3RiderDelivery1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1. Rider codes: human-readable, unique, backfilled deterministically.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "riders"
        ADD COLUMN IF NOT EXISTS "rider_code" character varying(20);
    `);
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        seq integer := 0;
      BEGIN
        FOR rec IN
          SELECT "id" FROM "riders" WHERE "rider_code" IS NULL ORDER BY "createdAt" ASC
        LOOP
          seq := seq + 1;
          UPDATE "riders"
            SET "rider_code" = 'RDR-' || lpad(seq::text, 6, '0')
            WHERE "id" = rec."id"
              AND NOT EXISTS (SELECT 1 FROM "riders" r2 WHERE r2."rider_code" = 'RDR-' || lpad(seq::text, 6, '0'));
        END LOOP;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_riders_rider_code"
        ON "riders" ("rider_code") WHERE "rider_code" IS NOT NULL;
    `);

    // ------------------------------------------------------------------
    // 2. OTP lifecycle columns on parcels; drop the plaintext OTP column.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "parcels"
        ADD COLUMN IF NOT EXISTS "delivery_otp_hash" character varying(255),
        ADD COLUMN IF NOT EXISTS "otp_expires_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "otp_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "otp_verified_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "otp_request_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "last_otp_requested_at" timestamptz;
    `);
    // Any legacy plaintext OTP becomes unusable the moment the new flow runs:
    // verification only consults the hash columns.
    await queryRunner.query(`
      ALTER TABLE "parcels" DROP COLUMN IF EXISTS "delivery_otp";
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parcels_otp_expires"
        ON "parcels" ("otp_expires_at") WHERE "otp_expires_at" IS NOT NULL;
    `);

    // ------------------------------------------------------------------
    // 3. delivery_attempts: append-only attempt + proof-of-delivery log.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_attempts_outcome_enum') THEN
          CREATE TYPE "delivery_attempts_outcome_enum" AS ENUM
            ('DELIVERED', 'FAILED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_attempts_failure_reason_enum') THEN
          CREATE TYPE "delivery_attempts_failure_reason_enum" AS ENUM
            ('CUSTOMER_UNAVAILABLE', 'CUSTOMER_REFUSED', 'ADDRESS_INCORRECT',
             'PAYMENT_NOT_READY', 'CUSTOMER_REQUESTED_RESCHEDULE',
             'DAMAGED_PACKAGE', 'OTHER');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "delivery_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "parcel_id" uuid NOT NULL,
        "rider_id" uuid NOT NULL,
        "attempt_number" integer NOT NULL,
        "outcome" "delivery_attempts_outcome_enum" NOT NULL,
        "failure_reason" "delivery_attempts_failure_reason_enum",
        "notes" text,
        "rescheduled_for" timestamptz,
        "metadata" jsonb,
        CONSTRAINT "PK_delivery_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_delivery_attempts_parcel"
          FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_delivery_attempts_rider"
          FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_delivery_attempts_parcel_number"
        ON "delivery_attempts" ("parcel_id", "attempt_number");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_attempts_rider_created"
        ON "delivery_attempts" ("rider_id", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_attempts_parcel_created"
        ON "delivery_attempts" ("parcel_id", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_attempts";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_attempts_failure_reason_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_attempts_outcome_enum";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "last_otp_requested_at";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "otp_request_count";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "otp_verified_at";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "otp_attempts";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "otp_expires_at";`);
    await queryRunner.query(`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "delivery_otp_hash";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_riders_rider_code";`);
    await queryRunner.query(`ALTER TABLE "riders" DROP COLUMN IF EXISTS "rider_code";`);
  }
}
