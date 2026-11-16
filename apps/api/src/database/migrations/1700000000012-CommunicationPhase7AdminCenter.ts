import { type MigrationInterface, type QueryRunner } from "typeorm";

const NEW_AUDIT_ACTIONS = [
  "INTERNAL_NOTE_VIEWED",
  "REPORT_REVIEW_STARTED",
  "ESCALATION_CHANGED",
  "ATTACHMENT_QUARANTINED",
  "ATTACHMENT_RELEASED",
  "ATTACHMENT_RESCAN_REQUESTED",
  "ATTACHMENT_RESTRICTED_ACCESSED",
  "ATTACHMENT_OBJECT_PURGED",
  "STAFF_GRANT_CHANGED",
] as const;

/**
 * Communication platform - Phase 7 Admin Communication Center.
 *
 * Additive and idempotent (every statement is IF NOT EXISTS / guarded):
 *   1. New `chat_audit_logs_action_enum` values.
 *   2. Escalation overlay on `chat_conversations` (nullable columns: no table
 *      rewrite, no backfill) + queue indexes + activity-ordering index.
 *   3. Malware-scan and retention columns on `chat_attachments`. Every
 *      existing row starts at scan_status = 'PENDING' (fail closed: nothing
 *      becomes downloadable until a scanner reports CLEAN for the exact
 *      verified checksum).
 *   4. Report-by-conversation index (inbox indicator, workspace panel).
 *   5. `chat_staff_grants`: explicit per-user grants for grant-required
 *      chat permissions (written only by the operator CLI).
 *
 * Locking: ADD COLUMN with a constant DEFAULT is metadata-only on PG 11+.
 * Adding the CHECK/FK constraints validates existing rows under an ACCESS
 * EXCLUSIVE lock, and index builds take a SHARE lock; both are brief while
 * chat tables are small. If they grow before go-live, pre-create the indexes
 * with CREATE INDEX CONCURRENTLY and add constraints NOT VALID + VALIDATE.
 *
 * Rollback drops everything added here except enum values (PostgreSQL cannot
 * drop enum values; nothing writes them once the Phase 7 code is rolled
 * back). `down` DESTROYS escalation state, scan results and grants.
 */
export class CommunicationPhase7AdminCenter1700000000012 implements MigrationInterface {
  name = "CommunicationPhase7AdminCenter1700000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of NEW_AUDIT_ACTIONS) {
      await queryRunner.query(
        `ALTER TYPE "public"."chat_audit_logs_action_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                        WHERE t.typname = 'chat_conversations_escalation_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."chat_conversations_escalation_status_enum"
            AS ENUM ('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                        WHERE t.typname = 'chat_attachments_scan_status_enum' AND n.nspname = 'public') THEN
          CREATE TYPE "public"."chat_attachments_scan_status_enum"
            AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');
        END IF;
      END $$;
    `);

    /* ---------------------------- escalation ---------------------------- */
    await queryRunner.query(`
      ALTER TABLE "chat_conversations"
        ADD COLUMN IF NOT EXISTS "escalation_status" "public"."chat_conversations_escalation_status_enum",
        ADD COLUMN IF NOT EXISTS "escalation_note" text,
        ADD COLUMN IF NOT EXISTS "escalation_assignee_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "escalation_updated_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "escalation_updated_by_user_id" uuid;
    `);
    await this.addConstraint(
      queryRunner,
      "chat_conversations",
      "FK_chat_conversations_escalation_assignee",
      `FOREIGN KEY ("escalation_assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await this.addConstraint(
      queryRunner,
      "chat_conversations",
      "FK_chat_conversations_escalation_updated_by",
      `FOREIGN KEY ("escalation_updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await this.addConstraint(
      queryRunner,
      "chat_conversations",
      "CHK_chat_conversations_escalation",
      `CHECK ("escalation_status" IS NULL OR "escalation_updated_at" IS NOT NULL)`,
    );
    await this.addConstraint(
      queryRunner,
      "chat_conversations",
      "CHK_chat_conversations_escalation_note",
      `CHECK ("escalation_note" IS NULL OR char_length("escalation_note") <= 1000)`,
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_escalation"
        ON "chat_conversations" ("escalation_status", "escalation_updated_at")
        WHERE "escalation_status" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_escalation_assignee"
        ON "chat_conversations" ("escalation_assignee_user_id")
        WHERE "escalation_assignee_user_id" IS NOT NULL;
    `);
    // Inbox keyset ordering by last activity (expression index; not modelled
    // by TypeORM metadata, like the Phase 2 FTS index).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_activity"
        ON "chat_conversations" ((COALESCE("last_message_at", "createdAt")), "id");
    `);

    /* ------------------------- attachment scan -------------------------- */
    await queryRunner.query(`
      ALTER TABLE "chat_attachments"
        ADD COLUMN IF NOT EXISTS "scan_status" "public"."chat_attachments_scan_status_enum" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "scan_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "scan_next_attempt_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "scanned_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "scanned_sha256" character(64),
        ADD COLUMN IF NOT EXISTS "scan_engine" character varying(64),
        ADD COLUMN IF NOT EXISTS "scan_threat" character varying(200),
        ADD COLUMN IF NOT EXISTS "scan_error" character varying(64),
        ADD COLUMN IF NOT EXISTS "quarantined_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "object_purged_at" timestamptz;
    `);
    await this.addConstraint(
      queryRunner,
      "chat_attachments",
      "CHK_chat_attachments_scan_attempts",
      `CHECK ("scan_attempts" >= 0)`,
    );
    // A scanner CLEAN verdict is bound to the exact verified object version.
    await this.addConstraint(
      queryRunner,
      "chat_attachments",
      "CHK_chat_attachments_scan_binding",
      `CHECK ("scanned_sha256" IS NULL OR "scanned_sha256" = "checksum_sha256")`,
    );
    await this.addConstraint(
      queryRunner,
      "chat_attachments",
      "CHK_chat_attachments_scan_clean",
      `CHECK ("scan_status" <> 'CLEAN' OR "scanned_at" IS NOT NULL)`,
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_attachments_scan_pending"
        ON "chat_attachments" ("createdAt")
        WHERE "status" = 'UPLOADED' AND "scan_status" = 'PENDING';
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_attachments_scan_blocked"
        ON "chat_attachments" ("scan_status", "createdAt")
        WHERE "scan_status" IN ('INFECTED', 'FAILED');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_attachments_conversation_created"
        ON "chat_attachments" ("conversation_id", "createdAt");
    `);

    /* ------------------------------ reports ----------------------------- */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_reports_conversation_status"
        ON "chat_reports" ("conversation_id", "status");
    `);

    /* --------------------------- staff grants --------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_staff_grants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "permission" character varying(64) NOT NULL,
        "reason" text NOT NULL,
        "granted_by" character varying(120) NOT NULL,
        "expires_at" timestamptz,
        "revoked_at" timestamptz,
        "revoked_by" character varying(120),
        "revoke_reason" text,
        CONSTRAINT "PK_chat_staff_grants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_staff_grants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_staff_grants_permission" CHECK ("permission" IN ('chat.attachment.restricted_access', 'chat.attachment.quarantine_manage', 'chat.retention.manage')),
        CONSTRAINT "CHK_chat_staff_grants_reason" CHECK (char_length(btrim("reason")) BETWEEN 10 AND 500),
        CONSTRAINT "CHK_chat_staff_grants_revoked" CHECK ("revoked_at" IS NULL OR ("revoked_by" IS NOT NULL AND "revoke_reason" IS NOT NULL))
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_staff_grants_active"
        ON "chat_staff_grants" ("user_id", "permission")
        WHERE "revoked_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_staff_grants";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_reports_conversation_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_attachments_conversation_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_attachments_scan_blocked";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_attachments_scan_pending";`);
    await queryRunner.query(`
      ALTER TABLE "chat_attachments"
        DROP CONSTRAINT IF EXISTS "CHK_chat_attachments_scan_clean",
        DROP CONSTRAINT IF EXISTS "CHK_chat_attachments_scan_binding",
        DROP CONSTRAINT IF EXISTS "CHK_chat_attachments_scan_attempts",
        DROP COLUMN IF EXISTS "object_purged_at",
        DROP COLUMN IF EXISTS "quarantined_at",
        DROP COLUMN IF EXISTS "scan_error",
        DROP COLUMN IF EXISTS "scan_threat",
        DROP COLUMN IF EXISTS "scan_engine",
        DROP COLUMN IF EXISTS "scanned_sha256",
        DROP COLUMN IF EXISTS "scanned_at",
        DROP COLUMN IF EXISTS "scan_next_attempt_at",
        DROP COLUMN IF EXISTS "scan_attempts",
        DROP COLUMN IF EXISTS "scan_status";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_activity";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_escalation_assignee";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_escalation";`);
    await queryRunner.query(`
      ALTER TABLE "chat_conversations"
        DROP CONSTRAINT IF EXISTS "CHK_chat_conversations_escalation_note",
        DROP CONSTRAINT IF EXISTS "CHK_chat_conversations_escalation",
        DROP CONSTRAINT IF EXISTS "FK_chat_conversations_escalation_updated_by",
        DROP CONSTRAINT IF EXISTS "FK_chat_conversations_escalation_assignee",
        DROP COLUMN IF EXISTS "escalation_updated_by_user_id",
        DROP COLUMN IF EXISTS "escalation_updated_at",
        DROP COLUMN IF EXISTS "escalation_assignee_user_id",
        DROP COLUMN IF EXISTS "escalation_note",
        DROP COLUMN IF EXISTS "escalation_status";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_attachments_scan_status_enum";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."chat_conversations_escalation_status_enum";`,
    );
    // Audit enum values cannot be dropped in PostgreSQL; see class comment.
  }

  /** Adds a named constraint once (idempotent re-runs). */
  private async addConstraint(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    definition: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${definition};
        END IF;
      END $$;
    `);
  }
}
