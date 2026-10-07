import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 2 — Hub Operations.
 *
 * Adds the hub operational layer on top of the Phase 1 parcel core:
 * hub classification + lifecycle, per-user hub authorization, append-only
 * parcel scans, foreign-keyed manifest membership (replacing the
 * `manifests.bag_ids` jsonb array), and operational exceptions.
 *
 * Every statement is idempotent (`IF NOT EXISTS` / conditional blocks) so the
 * migration converges both a freshly-created and an already-migrated database.
 */
export class Phase2HubOperations1700000000002 implements MigrationInterface {
  name = "Phase2HubOperations1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1. Extend the existing controlled enums (new lifecycle values).
    //    ALTER TYPE ... ADD VALUE cannot be used by statements in the same
    //    transaction, so the new values are only referenced by later migrations
    //    and by the application.
    // ------------------------------------------------------------------
    await queryRunner.query(`ALTER TYPE "hubs_status_enum" ADD VALUE IF NOT EXISTS 'MAINTENANCE'`);
    await queryRunner.query(`ALTER TYPE "bags_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`);
    await queryRunner.query(
      `ALTER TYPE "manifests_status_enum" ADD VALUE IF NOT EXISTS 'IN_TRANSIT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "manifests_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );

    // ------------------------------------------------------------------
    // 2. Hub classification + lifecycle columns.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hubs_type_enum') THEN
          CREATE TYPE "hubs_type_enum" AS ENUM
            ('ORIGIN', 'DESTINATION', 'SORTING', 'REGIONAL', 'CENTRAL');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "hubs"
        ADD COLUMN IF NOT EXISTS "type" "hubs_type_enum" NOT NULL DEFAULT 'SORTING',
        ADD COLUMN IF NOT EXISTS "district" character varying(100),
        ADD COLUMN IF NOT EXISTS "thana" character varying(100);
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_hubs_status" ON "hubs" ("status")`);

    // ------------------------------------------------------------------
    // 3. Bag operator/audit columns.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "bags"
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "created_by" uuid,
        ADD COLUMN IF NOT EXISTS "sealed_by" uuid,
        ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP WITH TIME ZONE;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bags_origin_hub_status" ON "bags" ("origin_hub_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bags_destination_hub_status" ON "bags" ("destination_hub_id", "status")`,
    );

    // ------------------------------------------------------------------
    // 4. Manifests: operator columns, optional driver details.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "manifests"
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "created_by" uuid,
        ADD COLUMN IF NOT EXISTS "dispatched_by" uuid,
        ADD COLUMN IF NOT EXISTS "received_by" uuid,
        ALTER COLUMN "driver_name" DROP NOT NULL,
        ALTER COLUMN "driver_phone" DROP NOT NULL;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_manifests_origin_hub_status" ON "manifests" ("origin_hub_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_manifests_destination_hub_status" ON "manifests" ("destination_hub_id", "status")`,
    );

    // ------------------------------------------------------------------
    // 5. manifest_items: foreign-keyed membership replacing bag_ids jsonb.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "manifest_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "manifest_id" uuid NOT NULL,
        "bag_id" uuid,
        "parcel_id" uuid,
        CONSTRAINT "PK_manifest_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_manifest_items_single_ref"
          CHECK (("bag_id" IS NOT NULL) <> ("parcel_id" IS NOT NULL)),
        CONSTRAINT "FK_manifest_items_manifest"
          FOREIGN KEY ("manifest_id") REFERENCES "manifests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_manifest_items_bag"
          FOREIGN KEY ("bag_id") REFERENCES "bags"("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_manifest_items_manifest_bag" ON "manifest_items" ("manifest_id", "bag_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_manifest_items_bag" ON "manifest_items" ("bag_id")`,
    );

    // Backfill membership from the legacy jsonb array before dropping it.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'manifests'
            AND column_name = 'bag_ids'
        ) THEN
          INSERT INTO "manifest_items" ("manifest_id", "bag_id")
          SELECT m."id", (value)::uuid
          FROM "manifests" m
          CROSS JOIN LATERAL jsonb_array_elements_text(m."bag_ids") AS value
          WHERE jsonb_typeof(m."bag_ids") = 'array'
            AND jsonb_array_length(m."bag_ids") > 0
            AND EXISTS (SELECT 1 FROM "bags" b WHERE b."id" = (value)::uuid)
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "manifests" DROP COLUMN IF EXISTS "bag_ids"`);

    // ------------------------------------------------------------------
    // 6. bag_parcels: DB-enforced "one active bag per parcel".
    // ------------------------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "bag_parcels" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
    );

    // A row is active only while its bag still holds the parcel.
    await queryRunner.query(`
      UPDATE "bag_parcels" bp
      SET "is_active" = false
      FROM "bags" b
      WHERE bp."bag_id" = b."id"
        AND b."status" NOT IN ('OPEN', 'SEALED')
        AND bp."is_active" = true;
    `);

    // Defensively release duplicate active rows, keeping the most recent one,
    // so the partial unique index can be created on pre-existing data.
    await queryRunner.query(`
      UPDATE "bag_parcels" bp
      SET "is_active" = false
      WHERE bp."is_active" = true
        AND EXISTS (
          SELECT 1 FROM "bag_parcels" other
          WHERE other."parcel_id" = bp."parcel_id"
            AND other."is_active" = true
            AND (other."createdAt" > bp."createdAt"
                 OR (other."createdAt" = bp."createdAt" AND other."id" > bp."id"))
        );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bag_parcels_active_parcel"
         ON "bag_parcels" ("parcel_id") WHERE "is_active"`,
    );

    // ------------------------------------------------------------------
    // 7. parcel_scans: append-only scan log.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parcel_scans_scan_type_enum') THEN
          CREATE TYPE "parcel_scans_scan_type_enum" AS ENUM
            ('RECEIVE_INBOUND', 'BAG_PARCEL', 'DISPATCH_BAG', 'RECEIVE_TRANSFER', 'SORT', 'EXCEPTION');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parcel_scans_outcome_enum') THEN
          CREATE TYPE "parcel_scans_outcome_enum" AS ENUM
            ('APPLIED', 'DUPLICATE', 'REJECTED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parcel_scans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "parcel_id" uuid,
        "bag_id" uuid,
        "hub_id" uuid NOT NULL,
        "scan_type" "parcel_scans_scan_type_enum" NOT NULL,
        "outcome" "parcel_scans_outcome_enum" NOT NULL,
        "reason_code" character varying(64),
        "barcode" character varying(64) NOT NULL,
        "operator_id" uuid,
        "idempotency_key" character varying(128),
        "notes" text,
        "metadata" jsonb,
        CONSTRAINT "PK_parcel_scans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_parcel_scans_hub"
          FOREIGN KEY ("hub_id") REFERENCES "hubs"("id"),
        CONSTRAINT "FK_parcel_scans_parcel"
          FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id"),
        CONSTRAINT "FK_parcel_scans_bag"
          FOREIGN KEY ("bag_id") REFERENCES "bags"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_parcel_scans_parcel_created" ON "parcel_scans" ("parcel_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_parcel_scans_hub_created" ON "parcel_scans" ("hub_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_parcel_scans_bag" ON "parcel_scans" ("bag_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_parcel_scans_idempotency_key"
         ON "parcel_scans" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );

    // ------------------------------------------------------------------
    // 8. operational_exceptions.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operational_exceptions_type_enum') THEN
          CREATE TYPE "operational_exceptions_type_enum" AS ENUM
            ('MISSING_PARCEL', 'MISSING_BAG', 'UNEXPECTED_PARCEL', 'UNEXPECTED_BAG',
             'WRONG_DESTINATION', 'WRONG_HUB', 'DUPLICATE_SCAN', 'DAMAGED', 'INVALID_STATE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operational_exceptions_status_enum') THEN
          CREATE TYPE "operational_exceptions_status_enum" AS ENUM
            ('OPEN', 'RESOLVED', 'DISMISSED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operational_exceptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "hub_id" uuid NOT NULL,
        "parcel_id" uuid,
        "bag_id" uuid,
        "manifest_id" uuid,
        "type" "operational_exceptions_type_enum" NOT NULL,
        "status" "operational_exceptions_status_enum" NOT NULL DEFAULT 'OPEN',
        "description" text NOT NULL,
        "actor_id" uuid,
        "resolved_by" uuid,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "resolution_note" text,
        CONSTRAINT "PK_operational_exceptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_operational_exceptions_hub"
          FOREIGN KEY ("hub_id") REFERENCES "hubs"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_exceptions_hub_status" ON "operational_exceptions" ("hub_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_exceptions_status_created" ON "operational_exceptions" ("status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_exceptions_parcel" ON "operational_exceptions" ("parcel_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_exceptions_manifest" ON "operational_exceptions" ("manifest_id")`,
    );

    // ------------------------------------------------------------------
    // 9. hub_user_assignments: per-user hub authorization.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hub_user_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "hub_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_hub_user_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hub_user_assignments_hub"
          FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_hub_user_assignments_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_hub_user_assignments_user_hub"
         ON "hub_user_assignments" ("user_id", "hub_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_hub_user_assignments_hub" ON "hub_user_assignments" ("hub_id")`,
    );

    // ------------------------------------------------------------------
    // 10. Hub geography backfill from the free-text address columns.
    // ------------------------------------------------------------------
    await queryRunner.query(`
      UPDATE "hubs" SET "district" = 'Dhaka' WHERE "code" = 'HUB-DHK-01' AND "district" IS NULL;
      UPDATE "hubs" SET "district" = 'Chittagong' WHERE "code" = 'HUB-CTG-01' AND "district" IS NULL;
      UPDATE "hubs" SET "district" = 'Sylhet' WHERE "code" = 'HUB-SYL-01' AND "district" IS NULL;
      UPDATE "hubs" SET "district" = 'Rajshahi' WHERE "code" = 'HUB-RAJ-01' AND "district" IS NULL;
      UPDATE "hubs" SET "district" = 'Khulna' WHERE "code" = 'HUB-KHU-01' AND "district" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hub_user_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operational_exceptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parcel_scans"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "operational_exceptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "operational_exceptions_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parcel_scans_outcome_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parcel_scans_scan_type_enum"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bag_parcels_active_parcel"`);
    await queryRunner.query(`ALTER TABLE "bag_parcels" DROP COLUMN IF EXISTS "is_active"`);

    // Restore the legacy jsonb membership column.
    await queryRunner.query(
      `ALTER TABLE "manifests" ADD COLUMN IF NOT EXISTS "bag_ids" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(`
      UPDATE "manifests" m
      SET "bag_ids" = COALESCE(sub.ids, '[]'::jsonb)
      FROM (
        SELECT "manifest_id", jsonb_agg("bag_id") AS ids
        FROM "manifest_items"
        WHERE "bag_id" IS NOT NULL
        GROUP BY "manifest_id"
      ) sub
      WHERE m."id" = sub."manifest_id";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "manifest_items"`);

    await queryRunner.query(`
      ALTER TABLE "manifests"
        DROP COLUMN IF EXISTS "received_by",
        DROP COLUMN IF EXISTS "dispatched_by",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "notes";
    `);

    await queryRunner.query(`
      ALTER TABLE "bags"
        DROP COLUMN IF EXISTS "cancelled_at",
        DROP COLUMN IF EXISTS "sealed_by",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "notes";
    `);

    await queryRunner.query(`
      ALTER TABLE "hubs"
        DROP COLUMN IF EXISTS "thana",
        DROP COLUMN IF EXISTS "district",
        DROP COLUMN IF EXISTS "type";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hubs_type_enum"`);
  }
}
