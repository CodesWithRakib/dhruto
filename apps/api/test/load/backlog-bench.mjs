/* eslint-disable no-console -- CLI report script: printing results to stdout is its purpose */
// Communication Phase 8 — backlog scan throughput with a REAL clamd (DISPOSABLE environment only).
//
//   BENCH_DATABASE_URL=…test BENCH_BUCKET=… BENCH_S3_ENDPOINT=… node test/load/backlog-bench.mjs <files> <kb>
//
// Simulates the post-migration backlog: uploads <files> real objects (<kb> KiB
// PDF-shaped bytes) and inserts UPLOADED + scan PENDING rows exactly like rows
// left by migration 0012, then polls until the running API's scan job has
// given each of them a verdict. Prints throughput and verdict counts.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const url = process.env.BENCH_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname))
  throw new Error("BENCH_DATABASE_URL must name a disposable *test* database");
const files = Number(process.argv[2] ?? 200);
const kb = Number(process.argv[3] ?? 64);
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.BENCH_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
const db = new Client({ connectionString: url });
await db.connect();
const [{ id: conversation, created_by_user_id: uploader }] = (
  await db.query(`SELECT id, created_by_user_id FROM chat_conversations LIMIT 1`)
).rows;
const tag = randomUUID().slice(0, 8);
const ids = [];
for (let i = 0; i < files; i += 1) {
  const id = randomUUID();
  const body = Buffer.concat([
    Buffer.from("%PDF-1.7\n"),
    randomBytes(kb * 1024),
    Buffer.from("\n%%EOF\n"),
  ]);
  const key = `chat/${conversation}/${id}`;
  await s3.send(new PutObjectCommand({ Bucket: process.env.BENCH_BUCKET, Key: key, Body: body }));
  await db.query(
    `INSERT INTO chat_attachments (id, conversation_id, uploader_user_id, storage_key, original_filename, mime_type,
       size_bytes, checksum_sha256, status, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, 'application/pdf', $6, $7, 'UPLOADED', now())`,
    [
      id,
      conversation,
      uploader,
      key,
      `bench-${tag}-${i}.pdf`,
      body.byteLength,
      createHash("sha256").update(body).digest("hex"),
    ],
  );
  ids.push(id);
}
const t0 = Date.now();
let last = "";
for (;;) {
  const { rows } = await db.query(
    `SELECT scan_status, count(*)::int AS n FROM chat_attachments WHERE id = ANY($1::uuid[]) GROUP BY scan_status`,
    [ids],
  );
  const counts = Object.fromEntries(rows.map((r) => [r.scan_status, r.n]));
  const line = JSON.stringify(counts);
  if (line !== last) last = line;
  if (!counts.PENDING) {
    const seconds = (Date.now() - t0) / 1000;
    console.log(
      JSON.stringify({
        files,
        kb,
        seconds,
        filesPerMinute: +((files / seconds) * 60).toFixed(1),
        verdicts: counts,
      }),
    );
    break;
  }
  if (Date.now() - t0 > 30 * 60_000) {
    console.log(JSON.stringify({ timeout: true, counts }));
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
await db.end();
