import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Communication platform - Phase 2 backend support.
 *
 * Additive and idempotent:
 *   1. Three new `chat_audit_logs_action_enum` values used by the staff APIs.
 *   2. A GIN full-text index for authorized message search (`simple`
 *      configuration: language-neutral tokenisation that works for mixed
 *      English/Bangla text; no stemming).
 *   3. Indexes backing the staff listing queries (platform-wide conversation
 *      list, merchant/hub-scoped lists, global audit timeline).
 *
 * `ALTER TYPE ... ADD VALUE` is transaction-safe on PostgreSQL 12+ (project
 * runs 16); the new values are not used inside this migration.
 *
 * Rollback drops the indexes. PostgreSQL cannot remove enum values, so the
 * three audit actions remain after `down` — harmless, since nothing writes
 * them once the Phase 2 code is rolled back.
 */
export class CommunicationPhase2Backend1700000000011 implements MigrationInterface {
  name = "CommunicationPhase2Backend1700000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of [
      "ADMIN_CONVERSATIONS_LISTED",
      "ADMIN_CONVERSATION_EXPORTED",
      "AUDIT_LOG_VIEWED",
    ]) {
      await queryRunner.query(
        `ALTER TYPE "public"."chat_audit_logs_action_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_content_fts"
        ON "chat_messages" USING GIN (to_tsvector('simple'::regconfig, coalesce("content", '')))
        WHERE "deleted_at" IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_created"
        ON "chat_conversations" ("createdAt", "id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_merchant_created"
        ON "chat_conversations" ("merchant_id", "createdAt") WHERE "merchant_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_hub_created"
        ON "chat_conversations" ("hub_id", "createdAt") WHERE "hub_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_audit_logs_created"
        ON "chat_audit_logs" ("createdAt", "id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_audit_logs_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_hub_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_merchant_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_content_fts";`);
    // Enum values cannot be dropped in PostgreSQL; see class comment.
  }
}
