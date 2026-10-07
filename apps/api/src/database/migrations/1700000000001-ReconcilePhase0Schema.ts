import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Converts a database whose schema was created by the Phase 0 TypeORM
 * `synchronize` setup to the Phase 1 parcel-core model.
 *
 * Every statement is conditional, so this migration is a no-op on a database
 * that `InitialSchema` already created, while converging an existing Phase 0
 * database without dropping data.
 */
export class ReconcilePhase0Schema1700000000001 implements MigrationInterface {
  name = "ReconcilePhase0Schema1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. parcel_status_histories: rename the audit columns to the documented
    //    contract (actorId / actorRole / description) and add eventType.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'changed_by'
        ) THEN
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "changed_by" TO "actor_id";
          ALTER TABLE "parcel_status_histories" ALTER COLUMN "actor_id" DROP NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'changed_by_role'
        ) THEN
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "changed_by_role" TO "actor_role";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'reason'
        ) THEN
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "reason" TO "description";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "parcel_status_histories"
        ADD COLUMN IF NOT EXISTS "event_type" character varying(50) NOT NULL DEFAULT 'STATUS_CHANGED';
    `);

    // Backfill: the first row of every parcel is its creation event.
    await queryRunner.query(`
      UPDATE "parcel_status_histories"
      SET "event_type" = 'PARCEL_CREATED'
      WHERE "event_type" = 'STATUS_CHANGED'
        AND "from_status" IS NULL
        AND "to_status" = 'CREATED';
    `);

    // 2. parcels: first-class destination columns (indexable, filterable).
    await queryRunner.query(`
      ALTER TABLE "parcels"
        ADD COLUMN IF NOT EXISTS "parcel_description" character varying(500),
        ADD COLUMN IF NOT EXISTS "district" character varying(100),
        ADD COLUMN IF NOT EXISTS "thana" character varying(100);
    `);

    await queryRunner.query(`
      UPDATE "parcels"
      SET "district" = COALESCE("district", "normalized_address" ->> 'district'),
          "thana" = COALESCE("thana", "normalized_address" ->> 'thana')
      WHERE "normalized_address" IS NOT NULL
        AND ("district" IS NULL OR "thana" IS NULL);
    `);

    // 3. idempotency_records: support in-flight claims, payload fingerprints and
    //    completion timestamps.
    await queryRunner.query(`
      ALTER TABLE "idempotency_records"
        ADD COLUMN IF NOT EXISTS "request_hash" character varying(64),
        ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN "status_code" DROP NOT NULL,
        ALTER COLUMN "response" DROP NOT NULL;
    `);

    // 4. Indexes that serve the paginated merchant parcel list. Names match the
    //    TypeORM-generated index names used by InitialSchema exactly.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b625f677dcb5849d72445365e9" ON "parcels" ("merchant_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_badd75f47a7cdc7d27d3204cf0" ON "parcels" ("merchant_id", "district")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_badd75f47a7cdc7d27d3204cf0"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b625f677dcb5849d72445365e9"`);

    await queryRunner.query(`
      ALTER TABLE "idempotency_records"
        ALTER COLUMN "status_code" SET NOT NULL,
        ALTER COLUMN "response" SET NOT NULL,
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "request_hash";
    `);

    await queryRunner.query(`
      ALTER TABLE "parcels"
        DROP COLUMN IF EXISTS "thana",
        DROP COLUMN IF EXISTS "district",
        DROP COLUMN IF EXISTS "parcel_description";
    `);

    await queryRunner.query(
      `ALTER TABLE "parcel_status_histories" DROP COLUMN IF EXISTS "event_type"`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'description'
        ) THEN
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "description" TO "reason";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'actor_role'
        ) THEN
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "actor_role" TO "changed_by_role";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parcel_status_histories'
            AND column_name = 'actor_id'
        ) THEN
          UPDATE "parcel_status_histories" SET "actor_id" = '00000000-0000-0000-0000-000000000000' WHERE "actor_id" IS NULL;
          ALTER TABLE "parcel_status_histories" RENAME COLUMN "actor_id" TO "changed_by";
          ALTER TABLE "parcel_status_histories" ALTER COLUMN "changed_by" SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}
