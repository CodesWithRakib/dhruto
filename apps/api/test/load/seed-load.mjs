/* eslint-disable no-console -- CLI report script: printing results to stdout is its purpose */
// Communication Phase 8 — synthetic load dataset for a DISPOSABLE database.
//
//   LOAD_DATABASE_URL=postgres://…/<name containing "test">  LOAD_JWT_SECRET=<test secret> \
//   node test/load/seed-load.mjs <out-tokens.json> [conversations=2000] [messagesPerConversation=50]
//
// Refuses any database whose name lacks "test". Writes users, merchants,
// riders, parcels, PARCEL_DELIVERY conversations (merchant OWNER, rider and
// customer MEMBER), messages with gap-free sequences and CLEAN attachments,
// then prints counts and writes tokens signed with LOAD_JWT_SECRET (the same
// HS256 scheme as CustomJwtService) for the load tools. No real data.
import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const url = process.env.LOAD_DATABASE_URL;
const secret = process.env.LOAD_JWT_SECRET;
const out = process.argv[2];
const CONVERSATIONS = Number(process.argv[3] ?? 2000);
const MESSAGES = Number(process.argv[4] ?? 50);
const MERCHANTS = 50;
const RIDERS = 100;
if (!url || !secret || !out)
  throw new Error("LOAD_DATABASE_URL, LOAD_JWT_SECRET and output path required");
if (!/test/i.test(new URL(url).pathname))
  throw new Error("Refusing: database name must contain 'test'");

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
function token(user) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    merchantId: null,
    riderId: null,
    hubId: null,
    type: "access",
    iat: now,
    exp: now + 6 * 3600,
  })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

const db = new Client({ connectionString: url });
await db.connect();
const t0 = Date.now();
await db.query("BEGIN");
const hub = (
  await db.query(
    `INSERT INTO hubs (code, name, address) VALUES ('LOADH', 'Load Hub', 'Dhaka') RETURNING id`,
  )
).rows[0].id;

async function users(prefix, role, n, phoneBase) {
  const res = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     SELECT $1 || g, $1 || g || '@load-test.local', ($3::bigint + g)::text, 'x', $2::users_role_enum
       FROM generate_series(1, $4) g RETURNING id, email, phone, role`,
    [prefix, role, phoneBase, n],
  );
  return res.rows;
}
const merchants = await users("merchant", "MERCHANT", MERCHANTS, 1390000000);
const riders = await users("rider", "RIDER", RIDERS, 1391000000);
const customers = await users("customer", "CUSTOMER", CONVERSATIONS, 1392000000);
const [admin] = await users("loadadmin", "ADMIN", 1, 1393000000);

const merchantIds = (
  await db.query(
    `INSERT INTO merchants (user_id, business_name, contact_phone, pickup_address)
   SELECT u, 'Load Merchant', '0170', 'Dhaka' FROM unnest($1::uuid[]) u RETURNING id, user_id`,
    [merchants.map((m) => m.id)],
  )
).rows;
const riderIds = (
  await db.query(
    `INSERT INTO riders (user_id, hub_id) SELECT u, $2 FROM unnest($1::uuid[]) u RETURNING id, user_id`,
    [riders.map((r) => r.id), hub],
  )
).rows;

// Parcels + conversations + participants + messages (set-based SQL).
await db.query(
  `CREATE TEMP TABLE plan AS
   SELECT g AS n,
          gen_random_uuid() AS parcel_id, gen_random_uuid() AS conversation_id,
          (SELECT id FROM unnest($1::uuid[]) WITH ORDINALITY m(id, i) WHERE i = 1 + (g % $3)) AS merchant_id,
          (SELECT u FROM unnest($2::uuid[]) WITH ORDINALITY x(u, i) WHERE i = 1 + (g % $3)) AS merchant_user,
          (SELECT id FROM unnest($4::uuid[]) WITH ORDINALITY r(id, i) WHERE i = 1 + (g % $6)) AS rider_id,
          (SELECT u FROM unnest($5::uuid[]) WITH ORDINALITY x(u, i) WHERE i = 1 + (g % $6)) AS rider_user,
          (SELECT u FROM unnest($7::uuid[]) WITH ORDINALITY x(u, i) WHERE i = g) AS customer_user,
          (SELECT p FROM unnest($8::text[]) WITH ORDINALITY x(p, i) WHERE i = g) AS customer_phone
     FROM generate_series(1, $9) g`,
  [
    merchantIds.map((m) => m.id),
    merchantIds.map((m) => m.user_id),
    MERCHANTS,
    riderIds.map((r) => r.id),
    riderIds.map((r) => r.user_id),
    RIDERS,
    customers.map((c) => c.id),
    customers.map((c) => c.phone),
    CONVERSATIONS,
  ],
);
await db.query(
  `INSERT INTO parcels (id, tracking_code, merchant_id, recipient_name, recipient_phone, raw_address, current_rider_id, current_hub_id)
   SELECT parcel_id, 'LOAD-' || lpad(n::text, 6, '0'), merchant_id, 'Load', customer_phone, 'Dhaka', rider_id, $1 FROM plan`,
  [hub],
);
await db.query(
  `INSERT INTO chat_conversations (id, type, status, parcel_id, merchant_id, created_by_user_id, last_message_sequence, last_message_at, last_message_preview)
   SELECT conversation_id, 'PARCEL_DELIVERY', 'ACTIVE', parcel_id, merchant_id, merchant_user, $1,
          now() - (n || ' seconds')::interval, 'load message' FROM plan`,
  [MESSAGES],
);
await db.query(
  `INSERT INTO chat_participants (conversation_id, user_id, role, status, last_read_sequence, last_delivered_sequence)
   SELECT conversation_id, merchant_user, 'OWNER'::chat_participants_role_enum, 'ACTIVE'::chat_participants_status_enum, $1, $1 FROM plan
   UNION ALL SELECT conversation_id, rider_user, 'MEMBER'::chat_participants_role_enum, 'ACTIVE'::chat_participants_status_enum, $1 - 5, $1 - 5 FROM plan
   UNION ALL SELECT conversation_id, customer_user, 'MEMBER'::chat_participants_role_enum, 'ACTIVE'::chat_participants_status_enum, $1 - 10, $1 - 10 FROM plan`,
  [MESSAGES],
);
await db.query(
  `INSERT INTO chat_messages (conversation_id, sender_user_id, client_message_id, sequence, type, content, "createdAt")
   SELECT p.conversation_id,
          CASE s % 3 WHEN 0 THEN p.merchant_user WHEN 1 THEN p.rider_user ELSE p.customer_user END,
          gen_random_uuid(), s, 'TEXT',
          'load message ' || s || ' parcel status delivery update hello',
          now() - ((($1 - s) * 60) || ' seconds')::interval
     FROM plan p CROSS JOIN generate_series(1, $1) s`,
  [MESSAGES],
);
// One CLEAN attachment per conversation (linked to message 1) for download-authorization load.
const att = await db.query(
  `INSERT INTO chat_attachments (conversation_id, message_id, uploader_user_id, storage_key, original_filename, mime_type,
                                 size_bytes, checksum_sha256, status, uploaded_at, scan_status, scanned_at, scanned_sha256, scan_engine)
   SELECT p.conversation_id, m.id, p.merchant_user, 'chat/' || p.conversation_id || '/' || gen_random_uuid(), 'load.pdf',
          'application/pdf', 1024, repeat('a', 64), 'UPLOADED', now(), 'CLEAN', now(), repeat('a', 64), 'load-seed'
     FROM plan p JOIN chat_messages m ON m.conversation_id = p.conversation_id AND m.sequence = 1
   RETURNING id, conversation_id`,
);
const plan = (await db.query(`SELECT * FROM plan ORDER BY n`)).rows;
await db.query("COMMIT");
await db.query("ANALYZE");
const counts = (
  await db.query(
    `SELECT (SELECT count(*) FROM chat_conversations)::int AS conversations, (SELECT count(*) FROM chat_messages)::int AS messages,
          (SELECT count(*) FROM chat_participants)::int AS participants, (SELECT count(*) FROM chat_attachments)::int AS attachments`,
  )
).rows[0];
await db.end();

const attByConv = new Map(att.rows.map((r) => [r.conversation_id, r.id]));
const userById = new Map([...merchants, ...riders, ...customers, admin].map((u) => [u.id, u]));
writeFileSync(
  out,
  JSON.stringify({
    admin: { token: token(admin) },
    // One entry per conversation: participants' tokens + ids for scenarios.
    threads: plan.map((p) => ({
      conversationId: p.conversation_id,
      attachmentId: attByConv.get(p.conversation_id),
      merchant: { id: p.merchant_user, token: token(userById.get(p.merchant_user)) },
      rider: { id: p.rider_user, token: token(userById.get(p.rider_user)) },
      customer: { id: p.customer_user, token: token(userById.get(p.customer_user)) },
    })),
  }),
);
console.log(JSON.stringify({ ...counts, seconds: (Date.now() - t0) / 1000 }));
