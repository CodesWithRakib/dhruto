import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 7 - Analytics alerts and report exports.
 *
 * - analytics_alerts: deduped operational alert instances (one OPEN row per
 *   dedup key), with acknowledgement/resolution audit.
 * - report_exports: export requests with filter snapshots, server-side
 *   content, expiry and idempotency keys. All statements idempotent.
 */
export class Phase7Analytics1700000000008 implements MigrationInterface {
  name = "Phase7Analytics1700000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "alert_key" varchar(64) NOT NULL,
        "severity" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'OPEN',
        "scope" varchar(64) NOT NULL DEFAULT 'platform',
        "scope_id" uuid,
        "metric_value" float NOT NULL,
        "threshold" float NOT NULL,
        "dedup_key" varchar(192) NOT NULL,
        "triggered_at" timestamptz NOT NULL,
        "acknowledged_by" uuid,
        "acknowledged_at" timestamptz,
        "resolved_at" timestamptz,
        CONSTRAINT "UQ_analytics_alert_dedup" UNIQUE ("dedup_key"),
        CONSTRAINT "PK_analytics_alerts" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_analytics_alerts_status" ON "analytics_alerts" ("status", "triggered_at");
      CREATE INDEX IF NOT EXISTS "IDX_analytics_alerts_key" ON "analytics_alerts" ("alert_key", "status");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_exports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "dataset" varchar(16) NOT NULL,
        "format" varchar(8) NOT NULL DEFAULT 'csv',
        "status" varchar(16) NOT NULL DEFAULT 'PENDING',
        "idempotency_key" varchar(128),
        "filters" jsonb NOT NULL,
        "tenant_id" uuid,
        "requested_by" uuid NOT NULL,
        "row_count" int,
        "content" text,
        "file_name" varchar(255),
        "failure_reason" varchar(500),
        "expires_at" timestamptz,
        "ready_at" timestamptz,
        CONSTRAINT "PK_report_exports" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_report_export_idempotency" ON "report_exports" ("idempotency_key");
      CREATE INDEX IF NOT EXISTS "IDX_report_exports_user" ON "report_exports" ("requested_by", "createdAt");
      CREATE INDEX IF NOT EXISTS "IDX_report_exports_status" ON "report_exports" ("status", "expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_exports";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_alerts";`);
  }
}
