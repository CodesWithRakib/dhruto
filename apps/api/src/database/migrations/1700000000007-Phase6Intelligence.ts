import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 6 - Intelligence & smart decision engine.
 *
 * Adds versioned geography (dataset versions, canonical places, runtime
 * aliases), deterministic address parse records + auditable confirmations,
 * recipient feature aggregates + risk snapshots, RTO predictions with outcome
 * tracking, advisory recommendations with audited overrides, clean feedback
 * events and the scoring-model registry. All statements are idempotent.
 *
 * Phone numbers are stored as HMAC hashes only — never raw.
 */
export class Phase6Intelligence1700000000007 implements MigrationInterface {
  name = "Phase6Intelligence1700000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_dataset_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "version" varchar(64) NOT NULL,
        "source" varchar(255) NOT NULL,
        "imported_at" timestamptz NOT NULL,
        "divisions" int NOT NULL DEFAULT 0,
        "districts" int NOT NULL DEFAULT 0,
        "upazilas" int NOT NULL DEFAULT 0,
        "aliases" int NOT NULL DEFAULT 0,
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "UQ_geo_dataset_version" UNIQUE ("version"),
        CONSTRAINT "PK_geo_dataset_versions" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_places" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "kind" varchar(16) NOT NULL,
        "code" varchar(64) NOT NULL,
        "name" varchar(128) NOT NULL,
        "name_bn" varchar(128),
        "parent_id" uuid,
        "division" varchar(128),
        "zone" varchar(16),
        "aliases" jsonb NOT NULL DEFAULT '[]',
        "postal_codes" jsonb NOT NULL DEFAULT '[]',
        "dataset_version" varchar(64) NOT NULL,
        CONSTRAINT "UQ_geo_place_code" UNIQUE ("code"),
        CONSTRAINT "PK_geo_places" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_geo_places_kind_parent" ON "geo_places" ("kind", "parent_id");
      CREATE INDEX IF NOT EXISTS "IDX_geo_places_dataset" ON "geo_places" ("dataset_version");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "address_aliases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "place_id" uuid NOT NULL,
        "alias" varchar(128) NOT NULL,
        "normalized_alias" varchar(128) NOT NULL,
        "language" varchar(8) NOT NULL DEFAULT 'en',
        "alias_type" varchar(32) NOT NULL,
        "source" varchar(128),
        CONSTRAINT "UQ_address_alias_normalized" UNIQUE ("normalized_alias"),
        CONSTRAINT "PK_address_aliases" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_address_alias_place" ON "address_aliases" ("place_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "address_parses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "parcel_id" uuid,
        "original_address" text NOT NULL,
        "normalized_address" text NOT NULL,
        "normalized_hash" varchar(64) NOT NULL,
        "structured" jsonb NOT NULL,
        "confidence" float NOT NULL,
        "matched_by" varchar(32) NOT NULL,
        "has_conflict" boolean NOT NULL DEFAULT false,
        "conflict_detail" text,
        "candidates" jsonb NOT NULL DEFAULT '[]',
        "parser_version" varchar(64) NOT NULL,
        "dataset_version" varchar(64) NOT NULL,
        "language" varchar(8) NOT NULL DEFAULT 'EN',
        CONSTRAINT "PK_address_parses" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_address_parses_parcel" ON "address_parses" ("parcel_id");
      CREATE INDEX IF NOT EXISTS "IDX_address_parses_hash" ON "address_parses" ("normalized_hash");
      CREATE INDEX IF NOT EXISTS "IDX_address_parses_created" ON "address_parses" ("createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "address_confirmations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "parse_id" uuid NOT NULL,
        "parcel_id" uuid,
        "confirmed_by" uuid NOT NULL,
        "confirmation_source" varchar(16) NOT NULL,
        "structure" jsonb NOT NULL,
        "candidate_index" int,
        "reason" varchar(500),
        CONSTRAINT "PK_address_confirmations" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_address_confirmations_parse" ON "address_confirmations" ("parse_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recipient_feature_aggregates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "phone_hash" varchar(128) NOT NULL,
        "merchant_id" uuid,
        "scope" varchar(16) NOT NULL,
        "as_of" timestamptz NOT NULL,
        "total_orders" int NOT NULL DEFAULT 0,
        "delivered_orders" int NOT NULL DEFAULT 0,
        "returned_orders" int NOT NULL DEFAULT 0,
        "failed_attempts" int NOT NULL DEFAULT 0,
        "recent_failed_deliveries" int NOT NULL DEFAULT 0,
        "cod_collected_minor" bigint NOT NULL DEFAULT 0,
        "cod_failed_minor" bigint NOT NULL DEFAULT 0,
        "recent_order_count" int NOT NULL DEFAULT 0,
        "address_confidence" float,
        "feature_version" varchar(32) NOT NULL,
        "computed_at" timestamptz NOT NULL,
        CONSTRAINT "PK_recipient_feature_aggregates" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_recipient_features_scope"
        ON "recipient_feature_aggregates" ("phone_hash", "merchant_id");
      CREATE INDEX IF NOT EXISTS "IDX_recipient_features_phone" ON "recipient_feature_aggregates" ("phone_hash");
      CREATE INDEX IF NOT EXISTS "IDX_recipient_features_computed" ON "recipient_feature_aggregates" ("computed_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recipient_risk_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "phone_hash" varchar(128) NOT NULL,
        "merchant_id" uuid,
        "scope" varchar(16) NOT NULL,
        "risk_score" int NOT NULL,
        "level" varchar(16) NOT NULL,
        "reasons" jsonb NOT NULL DEFAULT '[]',
        "risk_confidence" varchar(8) NOT NULL,
        "scoring_version" varchar(64) NOT NULL,
        "features" jsonb NOT NULL,
        "scored_at" timestamptz NOT NULL,
        CONSTRAINT "PK_recipient_risk_snapshots" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_risk_snapshots_phone_scored" ON "recipient_risk_snapshots" ("phone_hash", "scored_at");
      CREATE INDEX IF NOT EXISTS "IDX_risk_snapshots_merchant" ON "recipient_risk_snapshots" ("merchant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rto_predictions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "parcel_id" uuid NOT NULL,
        "phone_hash" varchar(128) NOT NULL,
        "merchant_id" uuid,
        "score" int NOT NULL,
        "level" varchar(16) NOT NULL,
        "reasons" jsonb NOT NULL DEFAULT '[]',
        "model_type" varchar(16) NOT NULL,
        "model_version" varchar(64) NOT NULL,
        "features" jsonb NOT NULL,
        "predicted_at" timestamptz NOT NULL,
        "outcome" varchar(16),
        "outcome_at" timestamptz,
        CONSTRAINT "UQ_rto_prediction_parcel" UNIQUE ("parcel_id"),
        CONSTRAINT "PK_rto_predictions" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_rto_predictions_phone" ON "rto_predictions" ("phone_hash", "predicted_at");
      CREATE INDEX IF NOT EXISTS "IDX_rto_predictions_model" ON "rto_predictions" ("model_version");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intelligence_recommendations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "parcel_id" uuid NOT NULL,
        "prediction_id" uuid,
        "action" varchar(32) NOT NULL,
        "reasons" jsonb NOT NULL DEFAULT '[]',
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "overridden_by" uuid,
        "overridden_at" timestamptz,
        "override_reason" varchar(500),
        "override_decision" varchar(16),
        CONSTRAINT "PK_intelligence_recommendations" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_intel_reco_parcel" ON "intelligence_recommendations" ("parcel_id");
      CREATE INDEX IF NOT EXISTS "IDX_intel_reco_status" ON "intelligence_recommendations" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intelligence_feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "subject_type" varchar(32) NOT NULL,
        "subject_id" varchar(128) NOT NULL,
        "signal" varchar(32) NOT NULL,
        "actor_id" uuid,
        "detail" varchar(500),
        CONSTRAINT "PK_intelligence_feedback" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_intel_feedback_subject" ON "intelligence_feedback" ("subject_type", "subject_id");
      CREATE INDEX IF NOT EXISTS "IDX_intel_feedback_signal" ON "intelligence_feedback" ("signal");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scoring_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(64) NOT NULL,
        "version" varchar(64) NOT NULL,
        "type" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'DRAFT',
        "configuration" jsonb NOT NULL DEFAULT '{}',
        "activated_at" timestamptz,
        "retired_at" timestamptz,
        CONSTRAINT "UQ_scoring_model_version" UNIQUE ("name", "version"),
        CONSTRAINT "PK_scoring_models" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_scoring_models_name_status" ON "scoring_models" ("name", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "scoring_models",
      "intelligence_feedback",
      "intelligence_recommendations",
      "rto_predictions",
      "recipient_risk_snapshots",
      "recipient_feature_aggregates",
      "address_confirmations",
      "address_parses",
      "address_aliases",
      "geo_places",
      "geo_dataset_versions",
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}";`);
    }
  }
}
