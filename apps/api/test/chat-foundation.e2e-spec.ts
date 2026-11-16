import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { type DataSource } from "typeorm";
import {
  ChatAuditLog,
  ChatConversation,
  ChatInternalNote,
  ChatMessage,
  ChatMessageReaction,
  ChatParticipant,
} from "../src/database/entities/index.js";
import { CHAT_ENTITIES } from "../src/chat/chat.module.js";
import { CommunicationPhase1Foundation1700000000010 } from "../src/database/migrations/1700000000010-CommunicationPhase1Foundation.js";
import {
  CHAT_TEST_DATABASE_URL,
  allEntityClasses,
  createChatTestDataSource,
  inRolledBackTransaction,
  sqlStateOf,
} from "./utils/chat-test-db.js";

/**
 * Communication Phase 1 — schema, constraint and migration tests.
 *
 * Runs ONLY against a disposable PostgreSQL database supplied through
 * CHAT_TEST_DATABASE_URL (database name must contain "test"); the harness
 * drops the schema and migrates from zero. Skipped when the variable is unset,
 * so the regular `pnpm test` never touches a development database.
 */
const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";
const RESTRICT_VIOLATION = "23001";

const CHAT_TABLES = [
  "chat_conversations",
  "chat_participants",
  "chat_messages",
  "chat_attachments",
  "chat_message_reactions",
  "chat_message_edits",
  "chat_pins",
  "chat_reports",
  "chat_internal_notes",
  "chat_audit_logs",
  // Phase 7
  "chat_staff_grants",
];

describe.skipIf(!CHAT_TEST_DATABASE_URL)("Communication Phase 1 database foundation", () => {
  let ds: DataSource;
  let userA: string;
  let userB: string;
  let merchantId: string;
  let hubId: string;
  let parcelId: string;

  const suffix = () => Math.random().toString(36).slice(2, 10);

  async function insertUser(role = "CUSTOMER"): Promise<string> {
    const s = suffix();
    const phone = `017${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    const [row] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role")
       VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`Chat Test ${s}`, `chat-${s}@test.local`, phone, role],
    );
    return row.id as string;
  }

  async function insertConversation(
    overrides: Partial<{
      type: string;
      parcelId: string | null;
      merchantId: string | null;
      hubId: string | null;
    }> = {},
  ): Promise<string> {
    const [row] = await ds.query(
      `INSERT INTO "chat_conversations" ("type", "parcel_id", "merchant_id", "hub_id")
       VALUES ($1, $2, $3, $4) RETURNING "id"`,
      [
        overrides.type ?? "DIRECT",
        overrides.parcelId ?? null,
        overrides.merchantId ?? null,
        overrides.hubId ?? null,
      ],
    );
    return row.id as string;
  }

  async function insertTextMessage(
    conversationId: string,
    senderId: string,
    sequence: string,
    clientMessageId: string = randomUUID(),
  ): Promise<string> {
    const [row] = await ds.query(
      `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "client_message_id", "sequence", "type", "content")
       VALUES ($1, $2, $3, $4, 'TEXT', 'hello') RETURNING "id"`,
      [conversationId, senderId, clientMessageId, sequence],
    );
    return row.id as string;
  }

  beforeAll(async () => {
    ds = createChatTestDataSource(CHAT_TEST_DATABASE_URL as string);
    await ds.initialize(); // dropSchema: true — disposable database only
    await ds.runMigrations({ transaction: "each" });

    userA = await insertUser("MERCHANT");
    userB = await insertUser("RIDER");
    const [merchant] = await ds.query(
      `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
       VALUES ($1, 'Chat Test Shop', '01712345678', 'Dhaka') RETURNING "id"`,
      [userA],
    );
    merchantId = merchant.id;
    const [hub] = await ds.query(
      `INSERT INTO "hubs" ("code", "name", "address") VALUES ($1, 'Chat Test Hub', 'Dhaka') RETURNING "id"`,
      [`CHT-${suffix()}`],
    );
    hubId = hub.id;
    const [parcel] = await ds.query(
      `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address")
       VALUES ($1, $2, 'Recipient', '01812345678', 'Dhaka') RETURNING "id"`,
      [`DHT-CHAT-${suffix()}`, merchantId],
    );
    parcelId = parcel.id;
  }, 180_000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  /* ---------------------------------------------------------------- */
  /* Migration and entity alignment                                    */
  /* ---------------------------------------------------------------- */

  describe("migration up and entity alignment", () => {
    it("creates every chat table", async () => {
      const rows: Array<{ table_name: string }> = await ds.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'chat\\_%'`,
      );
      expect(rows.map((r) => r.table_name).sort()).toEqual([...CHAT_TABLES].sort());
    });

    it("has zero drift between chat entities and the migrated schema", async () => {
      const log = await ds.driver.createSchemaBuilder().log();
      const chatDrift = log.upQueries.map((q) => q.query).filter((q) => /chat_/.test(q));
      expect(chatDrift).toEqual([]);
    });

    it("registers all chat entities in ChatModule and the entity barrel", () => {
      const all = allEntityClasses();
      expect(CHAT_ENTITIES).toHaveLength(11);
      for (const entity of CHAT_ENTITIES) expect(all).toContain(entity);
    });

    it("reuses users_role_enum for the audit actor role (no duplicate role enum)", async () => {
      const [col] = await ds.query(
        `SELECT udt_name FROM information_schema.columns WHERE table_name = 'chat_audit_logs' AND column_name = 'actor_role'`,
      );
      expect(col.udt_name).toBe("users_role_enum");
      const roleLikeTypes: Array<{ typname: string }> = await ds.query(
        `SELECT typname FROM pg_type WHERE typname LIKE 'chat\\_%role%'`,
      );
      expect(roleLikeTypes.map((t) => t.typname)).toEqual(["chat_participants_role_enum"]);
    });

    it("re-running the migration up is a no-op (idempotent statements)", async () => {
      const runner = ds.createQueryRunner();
      try {
        await expect(
          new CommunicationPhase1Foundation1700000000010().up(runner),
        ).resolves.toBeUndefined();
      } finally {
        await runner.release();
      }
    });
  });

  describe("entity metadata", () => {
    it("ChatMessage: bigint sequence, nullable sender, relation delete rules", () => {
      const meta = ds.getMetadata(ChatMessage);
      const sequence = meta.findColumnWithPropertyName("sequence");
      expect(sequence?.type).toBe("bigint");
      expect(sequence?.isNullable).toBe(false);
      expect(meta.findColumnWithPropertyName("senderUserId")?.isNullable).toBe(true);
      expect(meta.findColumnWithPropertyName("conversationId")?.isNullable).toBe(false);
      expect(meta.findRelationWithPropertyPath("conversation")?.onDelete).toBe("RESTRICT");
      expect(meta.findRelationWithPropertyPath("replyTo")?.onDelete).toBe("SET NULL");
    });

    it("ChatParticipant: unique (conversation, user) index and bigint cursors", () => {
      const meta = ds.getMetadata(ChatParticipant);
      const unique = meta.indices.find((i) => i.name === "UQ_chat_participants_conversation_user");
      expect(unique?.isUnique).toBe(true);
      expect(unique?.columns.map((c) => c.propertyName)).toEqual(["conversationId", "userId"]);
      expect(meta.findColumnWithPropertyName("lastReadSequence")?.type).toBe("bigint");
      expect(meta.findColumnWithPropertyName("lastDeliveredSequence")?.type).toBe("bigint");
    });

    it("ChatConversation: optional scope references", () => {
      const meta = ds.getMetadata(ChatConversation);
      for (const prop of ["parcelId", "hubId", "merchantId", "createdByUserId"]) {
        expect(meta.findColumnWithPropertyName(prop)?.isNullable).toBe(true);
      }
      expect(meta.findColumnWithPropertyName("type")?.isNullable).toBe(false);
    });

    it("ChatAuditLog is append-only shaped (no updatedAt) and internal notes are not messages", () => {
      expect(ds.getMetadata(ChatAuditLog).findColumnWithPropertyName("updatedAt")).toBeUndefined();
      expect(ds.getMetadata(ChatInternalNote).tableName).toBe("chat_internal_notes");
      expect(ds.getMetadata(ChatMessage).relations.some((r) => r.type === ChatInternalNote)).toBe(
        false,
      );
    });

    it("ChatMessageReaction cascades with its message", () => {
      expect(
        ds.getMetadata(ChatMessageReaction).findRelationWithPropertyPath("message")?.onDelete,
      ).toBe("CASCADE");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Message ordering and idempotency                                  */
  /* ---------------------------------------------------------------- */

  describe("messages", () => {
    it("stores BIGINT sequences without precision loss", async () => {
      const conversationId = await insertConversation();
      const max = "9223372036854775807";
      const id = await insertTextMessage(conversationId, userA, max);
      const [row] = await ds.query(`SELECT "sequence" FROM "chat_messages" WHERE "id" = $1`, [id]);
      expect(row.sequence).toBe(max);
      const entity = await ds.getRepository(ChatMessage).findOneByOrFail({ id });
      expect(entity.sequence).toBe(max);
    });

    it("rejects a duplicate sequence within a conversation but allows it across conversations", async () => {
      const c1 = await insertConversation();
      const c2 = await insertConversation();
      await insertTextMessage(c1, userA, "1");
      expect(await sqlStateOf(() => insertTextMessage(c1, userB, "1"))).toBe(UNIQUE_VIOLATION);
      expect(await sqlStateOf(() => insertTextMessage(c2, userA, "1"))).toBeNull();
    });

    it("rejects non-positive sequences", async () => {
      const c = await insertConversation();
      expect(await sqlStateOf(() => insertTextMessage(c, userA, "0"))).toBe(CHECK_VIOLATION);
    });

    it("never persists a retried client message twice (idempotency key)", async () => {
      const c = await insertConversation();
      const clientId = randomUUID();
      await insertTextMessage(c, userA, "1", clientId);
      expect(await sqlStateOf(() => insertTextMessage(c, userA, "2", clientId))).toBe(
        UNIQUE_VIOLATION,
      );

      // The future send path uses ON CONFLICT on the same unique index.
      const retried = await ds.query(
        `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "client_message_id", "sequence", "type", "content")
         VALUES ($1, $2, $3, 3, 'TEXT', 'retry')
         ON CONFLICT ("conversation_id", "sender_user_id", "client_message_id") DO NOTHING RETURNING "id"`,
        [c, userA, clientId],
      );
      expect(retried).toHaveLength(0);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_messages" WHERE "conversation_id" = $1`,
        [c],
      );
      expect(count).toBe(1);

      // The same client id from a different sender is a different message.
      expect(await sqlStateOf(() => insertTextMessage(c, userB, "4", clientId))).toBeNull();
    });

    it("assigns gap-free unique sequences under concurrent senders (row-lock counter pattern)", async () => {
      const c = await insertConversation();
      const senders = 20;
      await Promise.all(
        Array.from({ length: senders }, (_, i) =>
          ds.transaction(async (manager) => {
            const [[next]] = await manager.query(
              `UPDATE "chat_conversations" SET "last_message_sequence" = "last_message_sequence" + 1
               WHERE "id" = $1 RETURNING "last_message_sequence"`,
              [c],
            );
            await manager.query(
              `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "client_message_id", "sequence", "type", "content")
               VALUES ($1, $2, $3, $4, 'TEXT', $5)`,
              [c, i % 2 === 0 ? userA : userB, randomUUID(), next.last_message_sequence, `m${i}`],
            );
          }),
        ),
      );
      const rows: Array<{ sequence: string }> = await ds.query(
        `SELECT "sequence" FROM "chat_messages" WHERE "conversation_id" = $1 ORDER BY "sequence"`,
        [c],
      );
      expect(rows.map((r) => r.sequence)).toEqual(
        Array.from({ length: senders }, (_, i) => String(i + 1)),
      );
      const [conv] = await ds.query(
        `SELECT "last_message_sequence" FROM "chat_conversations" WHERE "id" = $1`,
        [c],
      );
      expect(conv.last_message_sequence).toBe(String(senders));
    });

    it("enforces sender rules: system events have no sender, human messages need a client id", async () => {
      const c = await insertConversation();
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "sequence", "type", "metadata")
             VALUES ($1, $2, 1, 'SYSTEM_EVENT', '{"eventKey":"parcel.delivered"}')`,
            [c, userA],
          ),
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "sequence", "type", "content")
             VALUES ($1, $2, 2, 'TEXT', 'no client id')`,
            [c, userA],
          ),
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_messages" ("conversation_id", "sequence", "type", "metadata")
             VALUES ($1, 3, 'SYSTEM_EVENT', '{"eventKey":"parcel.delivered"}')`,
            [c],
          ),
        ),
      ).toBeNull();
    });

    it("rejects empty TEXT, oversized content and non-object metadata", async () => {
      const c = await insertConversation();
      const insert = (content: string, metadata: string | null = null) =>
        ds.query(
          `INSERT INTO "chat_messages" ("conversation_id", "sender_user_id", "client_message_id", "sequence", "type", "content", "metadata")
           VALUES ($1, $2, $3, (SELECT coalesce(max("sequence"), 0) + 1 FROM "chat_messages" WHERE "conversation_id" = $1), 'TEXT', $4, $5)`,
          [c, userA, randomUUID(), content, metadata],
        );
      expect(await sqlStateOf(() => insert("   "))).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insert("x".repeat(4001)))).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insert("ok", "[1,2]"))).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insert("x".repeat(4000)))).toBeNull();
    });

    it("serves keyset history pagination from the unique (conversation, sequence) index without a sort", async () => {
      const c = await insertConversation();
      for (let i = 1; i <= 5; i += 1) await insertTextMessage(c, userA, String(i));
      await inRolledBackTransaction(ds, async (runner) => {
        await runner.query(`SET LOCAL enable_seqscan = off`);
        const [{ "QUERY PLAN": plan }] = await runner.query(
          `EXPLAIN (FORMAT JSON) SELECT "id" FROM "chat_messages"
           WHERE "conversation_id" = $1 AND "sequence" < $2 ORDER BY "sequence" DESC LIMIT 50`,
          [c, "5000"],
        );
        const text = JSON.stringify(plan);
        expect(text).toContain("UQ_chat_messages_conversation_sequence");
        expect(text).not.toContain('"Node Type":"Sort"');
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* Participants                                                      */
  /* ---------------------------------------------------------------- */

  describe("participants", () => {
    it("prevents duplicate membership of a user in a conversation", async () => {
      const c = await insertConversation();
      const add = () =>
        ds.query(`INSERT INTO "chat_participants" ("conversation_id", "user_id") VALUES ($1, $2)`, [
          c,
          userA,
        ]);
      expect(await sqlStateOf(add)).toBeNull();
      expect(await sqlStateOf(add)).toBe(UNIQUE_VIOLATION);
    });

    it("enforces cursor ordering and left_at consistency", async () => {
      const c = await insertConversation();
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_participants" ("conversation_id", "user_id", "last_read_sequence", "last_delivered_sequence")
             VALUES ($1, $2, 10, 5)`,
            [c, userA],
          ),
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_participants" ("conversation_id", "user_id", "status") VALUES ($1, $2, 'LEFT')`,
            [c, userA],
          ),
        ),
      ).toBe(CHECK_VIOLATION);
    });

    it("rejects unknown users and conversations (foreign keys)", async () => {
      const c = await insertConversation();
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_participants" ("conversation_id", "user_id") VALUES ($1, $2)`,
            [c, randomUUID()],
          ),
        ),
      ).toBe(FK_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_participants" ("conversation_id", "user_id") VALUES ($1, $2)`,
            [randomUUID(), userA],
          ),
        ),
      ).toBe(FK_VIOLATION);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Conversations                                                     */
  /* ---------------------------------------------------------------- */

  describe("conversations", () => {
    it("requires parcel + merchant for PARCEL_DELIVERY and hub for HUB_OPERATIONS", async () => {
      expect(await sqlStateOf(() => insertConversation({ type: "PARCEL_DELIVERY" }))).toBe(
        CHECK_VIOLATION,
      );
      expect(
        await sqlStateOf(() => insertConversation({ type: "PARCEL_DELIVERY", parcelId })),
      ).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insertConversation({ type: "HUB_OPERATIONS" }))).toBe(
        CHECK_VIOLATION,
      );
      expect(await sqlStateOf(() => insertConversation({ type: "MERCHANT_DESK" }))).toBe(
        CHECK_VIOLATION,
      );
      expect(
        await sqlStateOf(() => insertConversation({ type: "HUB_OPERATIONS", hubId })),
      ).toBeNull();
    });

    it("allows exactly one PARCEL_DELIVERY conversation per parcel, but other parcel-linked types", async () => {
      expect(
        await sqlStateOf(() =>
          insertConversation({ type: "PARCEL_DELIVERY", parcelId, merchantId }),
        ),
      ).toBeNull();
      expect(
        await sqlStateOf(() =>
          insertConversation({ type: "PARCEL_DELIVERY", parcelId, merchantId }),
        ),
      ).toBe(UNIQUE_VIOLATION);
      expect(
        await sqlStateOf(() =>
          insertConversation({ type: "SUPPORT_TICKET", parcelId, merchantId }),
        ),
      ).toBeNull();
    });

    it("requires lifecycle timestamps for non-active statuses", async () => {
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_conversations" ("type", "status") VALUES ('GROUP', 'LOCKED')`,
          ),
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_conversations" ("type", "status", "closed_at") VALUES ('GROUP', 'CLOSED', now())`,
          ),
        ),
      ).toBeNull();
    });

    it("protects history: a conversation with messages cannot be deleted; message children cascade", async () => {
      const c = await insertConversation();
      const messageId = await insertTextMessage(c, userA, "1");
      await ds.query(
        `INSERT INTO "chat_message_reactions" ("message_id", "user_id", "reaction") VALUES ($1, $2, '👍')`,
        [messageId, userB],
      );
      const deleteConversation = await sqlStateOf(() =>
        ds.query(`DELETE FROM "chat_conversations" WHERE "id" = $1`, [c]),
      );
      expect([RESTRICT_VIOLATION, FK_VIOLATION]).toContain(deleteConversation);

      await ds.query(`DELETE FROM "chat_messages" WHERE "id" = $1`, [messageId]);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_message_reactions" WHERE "message_id" = $1`,
        [messageId],
      );
      expect(count).toBe(0);
    });

    it("rejects a duplicate reaction by the same user", async () => {
      const c = await insertConversation();
      const messageId = await insertTextMessage(c, userA, "1");
      const react = () =>
        ds.query(
          `INSERT INTO "chat_message_reactions" ("message_id", "user_id", "reaction") VALUES ($1, $2, '❤️')`,
          [messageId, userB],
        );
      expect(await sqlStateOf(react)).toBeNull();
      expect(await sqlStateOf(react)).toBe(UNIQUE_VIOLATION);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Attachments, reports, audit                                       */
  /* ---------------------------------------------------------------- */

  describe("attachments, reports and audit", () => {
    it("validates attachment checksum, size and storage key uniqueness", async () => {
      const c = await insertConversation();
      const insert = (storageKey: string, size: number, checksum: string) =>
        ds.query(
          `INSERT INTO "chat_attachments" ("conversation_id", "uploader_user_id", "storage_key", "original_filename", "mime_type", "size_bytes", "checksum_sha256")
           VALUES ($1, $2, $3, 'a.pdf', 'application/pdf', $4, $5)`,
          [c, userA, storageKey, size, checksum],
        );
      const key = `chat/${randomUUID()}`;
      expect(await sqlStateOf(() => insert(key, 10, "a".repeat(64)))).toBeNull();
      expect(await sqlStateOf(() => insert(key, 10, "b".repeat(64)))).toBe(UNIQUE_VIOLATION);
      expect(await sqlStateOf(() => insert(`chat/${randomUUID()}`, 0, "a".repeat(64)))).toBe(
        CHECK_VIOLATION,
      );
      expect(await sqlStateOf(() => insert(`chat/${randomUUID()}`, 10, "Z".repeat(64)))).toBe(
        CHECK_VIOLATION,
      );
    });

    it("allows one report per user per message and requires reviewer data on resolution", async () => {
      const c = await insertConversation();
      const messageId = await insertTextMessage(c, userA, "1");
      const report = () =>
        ds.query(
          `INSERT INTO "chat_reports" ("conversation_id", "message_id", "reporter_user_id", "reason") VALUES ($1, $2, $3, 'SPAM') RETURNING "id"`,
          [c, messageId, userB],
        );
      expect(await sqlStateOf(report)).toBeNull();
      expect(await sqlStateOf(report)).toBe(UNIQUE_VIOLATION);
      expect(
        await sqlStateOf(() =>
          ds.query(`UPDATE "chat_reports" SET "status" = 'RESOLVED' WHERE "message_id" = $1`, [
            messageId,
          ]),
        ),
      ).toBe(CHECK_VIOLATION);
    });

    it("requires a reason for admin access audit entries", async () => {
      const insert = (reason: string | null) =>
        ds.query(
          `INSERT INTO "chat_audit_logs" ("actor_user_id", "actor_role", "action", "conversation_id", "reason")
           VALUES ($1, 'ADMIN', 'ADMIN_CONVERSATION_VIEWED', $2, $3)`,
          [userA, randomUUID(), reason],
        );
      expect(await sqlStateOf(() => insert(null))).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insert("   "))).toBe(CHECK_VIOLATION);
      expect(await sqlStateOf(() => insert("Customer complaint #123"))).toBeNull();
    });

    it("rejects UPDATE on audit rows (append-only trigger)", async () => {
      const [row] = await ds.query(
        `INSERT INTO "chat_audit_logs" ("action", "metadata") VALUES ('CONVERSATION_CREATED', '{"source":"test"}') RETURNING "id"`,
      );
      expect(
        await sqlStateOf(() =>
          ds.query(`UPDATE "chat_audit_logs" SET "reason" = 'tamper' WHERE "id" = $1`, [row.id]),
        ),
      ).toBe(RESTRICT_VIOLATION);
    });

    it("rejects an empty internal note", async () => {
      const c = await insertConversation();
      expect(
        await sqlStateOf(() =>
          ds.query(
            `INSERT INTO "chat_internal_notes" ("conversation_id", "author_user_id", "body") VALUES ($1, $2, '  ')`,
            [c, userA],
          ),
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Rollback (must run last — it removes and recreates the schema)    */
  /* ---------------------------------------------------------------- */

  describe("migration down", () => {
    it("removes only chat objects, preserves existing data, and can be re-applied", async () => {
      const [{ count: usersBefore }] = await ds.query(`SELECT count(*)::int AS count FROM "users"`);

      // Revert Phase 7, Phase 2 (indexes) then Phase 1 (tables), newest first.
      await ds.undoLastMigration({ transaction: "each" });
      await ds.undoLastMigration({ transaction: "each" });
      await ds.undoLastMigration({ transaction: "each" });

      const chatTables = await ds.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'chat\\_%'`,
      );
      expect(chatTables).toHaveLength(0);
      const chatTypes = await ds.query(
        `SELECT typname FROM pg_type WHERE typname LIKE 'chat\\_%\\_enum'`,
      );
      expect(chatTypes).toHaveLength(0);
      const fn = await ds.query(
        `SELECT 1 FROM pg_proc WHERE proname = 'chat_audit_logs_reject_update'`,
      );
      expect(fn).toHaveLength(0);

      const [{ count: usersAfter }] = await ds.query(`SELECT count(*)::int AS count FROM "users"`);
      expect(usersAfter).toBe(usersBefore);
      const preserved = await ds.query(
        `SELECT typname FROM pg_type WHERE typname = 'users_role_enum'
         UNION ALL SELECT table_name FROM information_schema.tables WHERE table_name IN ('event_outbox', 'parcels')`,
      );
      expect(preserved).toHaveLength(3);

      const reapplied = await ds.runMigrations({ transaction: "each" });
      expect(reapplied.map((m) => m.name)).toEqual([
        "CommunicationPhase1Foundation1700000000010",
        "CommunicationPhase2Backend1700000000011",
        "CommunicationPhase7AdminCenter1700000000012",
      ]);
    });
  });
});
