/* eslint-disable no-console -- CLI report script: printing results to stdout is its purpose */
// Communication Phase 8 — lock-impact probe for migration rehearsals (DISPOSABLE databases only).
//
//   PROBE_DATABASE_URL=postgres://…/<name containing "test"> node test/load/lock-probe.mjs <seconds>
//
// Every 100 ms: a point read on chat_attachments, a point read on
// chat_conversations and a small write (UPDATE of one conversation's
// updatedAt). Prints the max/p99 latency per operation and the longest gap,
// i.e. how long ordinary traffic was blocked while a migration ran.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const url = process.env.PROBE_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname))
  throw new Error("PROBE_DATABASE_URL must name a disposable *test* database");
const seconds = Number(process.argv[2] ?? 60);
const db = new Client({ connectionString: url });
await db.connect();
const [{ id: conv }] = (await db.query(`SELECT id FROM chat_conversations LIMIT 1`)).rows;
const [{ id: att }] = (await db.query(`SELECT id FROM chat_attachments LIMIT 1`)).rows;
const ops = {
  read_attachment: () => db.query(`SELECT id FROM chat_attachments WHERE id = $1`, [att]),
  read_conversation: () => db.query(`SELECT id FROM chat_conversations WHERE id = $1`, [conv]),
  write_conversation: () =>
    db.query(`UPDATE chat_conversations SET "updatedAt" = now() WHERE id = $1`, [conv]),
};
const lat = Object.fromEntries(Object.keys(ops).map((k) => [k, []]));
const end = Date.now() + seconds * 1000;
while (Date.now() < end) {
  for (const [name, fn] of Object.entries(ops)) {
    const t0 = performance.now();
    await fn();
    lat[name].push(performance.now() - t0);
  }
  await new Promise((r) => setTimeout(r, 100));
}
await db.end();
const summary = {};
for (const [name, a] of Object.entries(lat)) {
  const s = [...a].sort((x, y) => x - y);
  summary[name] = {
    samples: s.length,
    p50: +s[Math.floor(s.length / 2)].toFixed(1),
    p99: +s[Math.floor(s.length * 0.99)].toFixed(1),
    max: +s[s.length - 1].toFixed(1),
  };
}
console.log(JSON.stringify(summary));
