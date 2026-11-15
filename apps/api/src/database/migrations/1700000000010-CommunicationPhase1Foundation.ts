import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Communication platform - Phase 1 database foundation.
 *
 * Additive only: creates the `chat_*` tables, their enum types, constraints,
 * indexes and the audit-log immutability trigger. No existing table, column,
 * type or row is modified. All statements are idempotent (IF NOT EXISTS /
 * guarded DO blocks), matching the existing migration conventions.
 *
 * Reuses:
 *   - `users_role_enum` for `chat_audit_logs.actor_role` (no duplicate role enum)
 *   - `event_outbox` for future chat domain events (no separate chat outbox)
 *
 * Rollback (`down`) drops only the objects created here. It destroys chat
 * data, so it is safe only before chat features are live; after go-live,
 * prefer a forward fix migration. See docs/communication/DATABASE-DESIGN.md.
 */
export class CommunicationPhase1Foundation1700000000010 implements MigrationInterface {
  name = "CommunicationPhase1Foundation1700000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_def record;
      BEGIN
        FOR enum_def IN
          SELECT * FROM (VALUES
            ('chat_conversations_type_enum', ARRAY['PARCEL_DELIVERY','SUPPORT_TICKET','HUB_OPERATIONS','MERCHANT_DESK','INTERNAL_SUPERVISOR','DIRECT','GROUP']),
            ('chat_conversations_status_enum', ARRAY['ACTIVE','ARCHIVED','CLOSED','LOCKED']),
            ('chat_participants_role_enum', ARRAY['OWNER','MODERATOR','MEMBER','OBSERVER']),
            ('chat_participants_status_enum', ARRAY['ACTIVE','LEFT','REMOVED']),
            ('chat_participants_notification_level_enum', ARRAY['ALL','MENTIONS','NONE']),
            ('chat_messages_type_enum', ARRAY['TEXT','IMAGE','FILE','LOCATION','VOICE','SYSTEM_EVENT','QUICK_ACTION']),
            ('chat_attachments_status_enum', ARRAY['PENDING','UPLOADED','REJECTED']),
            ('chat_reports_reason_enum', ARRAY['SPAM','ABUSE','FRAUD','PRIVACY_VIOLATION','INAPPROPRIATE_CONTENT','OTHER']),
            ('chat_reports_status_enum', ARRAY['OPEN','UNDER_REVIEW','RESOLVED','DISMISSED']),
            ('chat_audit_logs_action_enum', ARRAY['CONVERSATION_CREATED','CONVERSATION_STATUS_CHANGED','PARTICIPANT_ADDED','PARTICIPANT_REMOVED','PARTICIPANT_ROLE_CHANGED','ADMIN_CONVERSATION_VIEWED','ADMIN_INTERVENTION','MESSAGE_REMOVED_BY_MODERATOR','MESSAGE_PINNED','MESSAGE_UNPINNED','REPORT_RESOLVED','INTERNAL_NOTE_CREATED','INTERNAL_NOTE_DELETED','ATTACHMENT_REJECTED'])
          ) AS v(type_name, labels)
        LOOP
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = enum_def.type_name AND n.nspname = 'public'
          ) THEN
            EXECUTE format(
              'CREATE TYPE "public".%I AS ENUM (%s)',
              enum_def.type_name,
              (SELECT string_agg(quote_literal(label), ', ') FROM unnest(enum_def.labels) AS label)
            );
          END IF;
        END LOOP;
      END $$;
    `);

    /* -------------------------------------------------------------- */
    /* chat_conversations                                              */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "type" "public"."chat_conversations_type_enum" NOT NULL,
        "title" character varying(200),
        "status" "public"."chat_conversations_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "parcel_id" uuid,
        "hub_id" uuid,
        "merchant_id" uuid,
        "created_by_user_id" uuid,
        "last_message_sequence" bigint NOT NULL DEFAULT '0',
        "last_message_id" uuid,
        "last_message_at" timestamptz,
        "last_message_preview" character varying(280),
        "archived_at" timestamptz,
        "closed_at" timestamptz,
        "locked_at" timestamptz,
        CONSTRAINT "PK_chat_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_conversations_parcel" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_conversations_hub" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_conversations_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_conversations_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_conversations_scope" CHECK (("type" <> 'PARCEL_DELIVERY' OR ("parcel_id" IS NOT NULL AND "merchant_id" IS NOT NULL)) AND ("type" <> 'HUB_OPERATIONS' OR "hub_id" IS NOT NULL) AND ("type" <> 'MERCHANT_DESK' OR "merchant_id" IS NOT NULL)),
        CONSTRAINT "CHK_chat_conversations_status_timestamps" CHECK (("status" <> 'ARCHIVED' OR "archived_at" IS NOT NULL) AND ("status" <> 'CLOSED' OR "closed_at" IS NOT NULL) AND ("status" <> 'LOCKED' OR "locked_at" IS NOT NULL)),
        CONSTRAINT "CHK_chat_conversations_sequence" CHECK ("last_message_sequence" >= 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_type_status_last_message"
        ON "chat_conversations" ("type", "status", "last_message_at");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_parcel_type"
        ON "chat_conversations" ("parcel_id", "type") WHERE "parcel_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_conversations_parcel_delivery"
        ON "chat_conversations" ("parcel_id") WHERE "type" = 'PARCEL_DELIVERY';
    `);

    /* -------------------------------------------------------------- */
    /* chat_participants                                               */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "public"."chat_participants_role_enum" NOT NULL DEFAULT 'MEMBER',
        "status" "public"."chat_participants_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "left_at" timestamptz,
        "last_read_sequence" bigint NOT NULL DEFAULT '0',
        "last_delivered_sequence" bigint NOT NULL DEFAULT '0',
        "is_muted" boolean NOT NULL DEFAULT false,
        "muted_until" timestamptz,
        "notification_level" "public"."chat_participants_notification_level_enum" NOT NULL DEFAULT 'ALL',
        CONSTRAINT "PK_chat_participants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_participants_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_participants_cursors" CHECK ("last_read_sequence" >= 0 AND "last_delivered_sequence" >= "last_read_sequence"),
        CONSTRAINT "CHK_chat_participants_left_at" CHECK (("status" = 'ACTIVE' AND "left_at" IS NULL) OR ("status" <> 'ACTIVE' AND "left_at" IS NOT NULL))
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_participants_conversation_user"
        ON "chat_participants" ("conversation_id", "user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_participants_user_active"
        ON "chat_participants" ("user_id", "conversation_id") WHERE "status" = 'ACTIVE';
    `);

    /* -------------------------------------------------------------- */
    /* chat_messages                                                   */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "sender_user_id" uuid,
        "client_message_id" uuid,
        "sequence" bigint NOT NULL,
        "type" "public"."chat_messages_type_enum" NOT NULL,
        "content" text,
        "reply_to_message_id" uuid,
        "metadata" jsonb,
        "edited_at" timestamptz,
        "deleted_at" timestamptz,
        "deleted_by_user_id" uuid,
        CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_messages_sender" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_messages_reply_to" FOREIGN KEY ("reply_to_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_messages_deleted_by" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_messages_sequence" CHECK ("sequence" > 0),
        CONSTRAINT "CHK_chat_messages_sender" CHECK (("type" = 'SYSTEM_EVENT' AND "sender_user_id" IS NULL) OR ("type" <> 'SYSTEM_EVENT' AND "sender_user_id" IS NOT NULL AND "client_message_id" IS NOT NULL)),
        CONSTRAINT "CHK_chat_messages_content_length" CHECK ("content" IS NULL OR char_length("content") <= 4000),
        CONSTRAINT "CHK_chat_messages_text_content" CHECK ("type" <> 'TEXT' OR "deleted_at" IS NOT NULL OR ("content" IS NOT NULL AND char_length(btrim("content")) > 0)),
        CONSTRAINT "CHK_chat_messages_metadata_object" CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_messages_conversation_sequence"
        ON "chat_messages" ("conversation_id", "sequence");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_messages_conversation_sender_client"
        ON "chat_messages" ("conversation_id", "sender_user_id", "client_message_id");
    `);

    /* -------------------------------------------------------------- */
    /* chat_attachments                                                */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "message_id" uuid,
        "uploader_user_id" uuid NOT NULL,
        "storage_key" character varying(512) NOT NULL,
        "original_filename" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" integer NOT NULL,
        "checksum_sha256" character(64) NOT NULL,
        "status" "public"."chat_attachments_status_enum" NOT NULL DEFAULT 'PENDING',
        "uploaded_at" timestamptz,
        CONSTRAINT "PK_chat_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_attachments_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_attachments_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_attachments_uploader" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_attachments_size" CHECK ("size_bytes" > 0),
        CONSTRAINT "CHK_chat_attachments_checksum" CHECK ("checksum_sha256" ~ '^[a-f0-9]{64}$'),
        CONSTRAINT "CHK_chat_attachments_uploaded_at" CHECK ("status" <> 'UPLOADED' OR "uploaded_at" IS NOT NULL)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_attachments_storage_key"
        ON "chat_attachments" ("storage_key");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_attachments_message"
        ON "chat_attachments" ("message_id") WHERE "message_id" IS NOT NULL;
    `);

    /* -------------------------------------------------------------- */
    /* chat_message_reactions / chat_message_edits / chat_pins         */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_message_reactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "reaction" character varying(32) NOT NULL,
        CONSTRAINT "PK_chat_message_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_message_reactions_reaction" CHECK (char_length("reaction") BETWEEN 1 AND 32)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_message_reactions_message_user_reaction"
        ON "chat_message_reactions" ("message_id", "user_id", "reaction");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_message_edits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "message_id" uuid NOT NULL,
        "editor_user_id" uuid NOT NULL,
        "previous_content" text NOT NULL,
        CONSTRAINT "PK_chat_message_edits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_message_edits_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_message_edits_editor" FOREIGN KEY ("editor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_message_edits_message_created"
        ON "chat_message_edits" ("message_id", "createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_pins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "message_id" uuid NOT NULL,
        "pinned_by_user_id" uuid NOT NULL,
        CONSTRAINT "PK_chat_pins" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_pins_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_pins_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_pins_pinned_by" FOREIGN KEY ("pinned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_pins_message" ON "chat_pins" ("message_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_pins_conversation_created"
        ON "chat_pins" ("conversation_id", "createdAt");
    `);

    /* -------------------------------------------------------------- */
    /* chat_reports                                                    */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "message_id" uuid,
        "reporter_user_id" uuid NOT NULL,
        "reason" "public"."chat_reports_reason_enum" NOT NULL,
        "details" text,
        "status" "public"."chat_reports_status_enum" NOT NULL DEFAULT 'OPEN',
        "reviewed_by_user_id" uuid,
        "reviewed_at" timestamptz,
        "resolution_note" text,
        CONSTRAINT "PK_chat_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_reports_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_reports_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_reports_reporter" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_reports_reviewed_by" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_reports_review" CHECK ("status" IN ('OPEN', 'UNDER_REVIEW') OR ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)),
        CONSTRAINT "CHK_chat_reports_details_length" CHECK ("details" IS NULL OR char_length("details") <= 1000)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_reports_message_reporter"
        ON "chat_reports" ("message_id", "reporter_user_id") WHERE "message_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_reports_status_created"
        ON "chat_reports" ("status", "createdAt");
    `);

    /* -------------------------------------------------------------- */
    /* chat_internal_notes                                             */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_internal_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "author_user_id" uuid NOT NULL,
        "body" text NOT NULL,
        "deleted_at" timestamptz,
        CONSTRAINT "PK_chat_internal_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_internal_notes_conversation" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_internal_notes_author" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_internal_notes_body" CHECK (char_length(btrim("body")) BETWEEN 1 AND 4000)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_internal_notes_conversation_created"
        ON "chat_internal_notes" ("conversation_id", "createdAt");
    `);

    /* -------------------------------------------------------------- */
    /* chat_audit_logs (append-only)                                   */
    /* -------------------------------------------------------------- */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "actor_user_id" uuid,
        "actor_role" "public"."users_role_enum",
        "action" "public"."chat_audit_logs_action_enum" NOT NULL,
        "conversation_id" uuid,
        "target_type" character varying(32),
        "target_id" uuid,
        "reason" text,
        "request_id" character varying(128),
        "metadata" jsonb,
        CONSTRAINT "PK_chat_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_audit_logs_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_chat_audit_logs_admin_reason" CHECK ("action" NOT IN ('ADMIN_CONVERSATION_VIEWED', 'ADMIN_INTERVENTION') OR ("reason" IS NOT NULL AND char_length(btrim("reason")) > 0)),
        CONSTRAINT "CHK_chat_audit_logs_metadata_object" CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_audit_logs_conversation_created"
        ON "chat_audit_logs" ("conversation_id", "createdAt") WHERE "conversation_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_audit_logs_actor_created"
        ON "chat_audit_logs" ("actor_user_id", "createdAt") WHERE "actor_user_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "chat_audit_logs_reject_update"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'chat_audit_logs is append-only (UPDATE rejected)'
          USING ERRCODE = 'restrict_violation';
      END;
      $$;
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_chat_audit_logs_immutable" ON "chat_audit_logs";`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "TRG_chat_audit_logs_immutable"
        BEFORE UPDATE ON "chat_audit_logs"
        FOR EACH ROW EXECUTE FUNCTION "chat_audit_logs_reject_update"();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse dependency order. Drops ONLY objects created by `up`.
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_chat_audit_logs_immutable" ON "chat_audit_logs";`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS "chat_audit_logs_reject_update"();`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_internal_notes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_reports";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_pins";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_message_edits";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_message_reactions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_attachments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_participants";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_conversations";`);
    for (const typeName of [
      "chat_audit_logs_action_enum",
      "chat_reports_status_enum",
      "chat_reports_reason_enum",
      "chat_attachments_status_enum",
      "chat_messages_type_enum",
      "chat_participants_notification_level_enum",
      "chat_participants_status_enum",
      "chat_participants_role_enum",
      "chat_conversations_status_enum",
      "chat_conversations_type_enum",
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."${typeName}";`);
    }
    // `users_role_enum` and `event_outbox` are pre-existing and intentionally untouched.
  }
}
