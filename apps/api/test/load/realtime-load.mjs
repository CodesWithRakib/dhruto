/* eslint-disable no-console -- CLI report script: printing results to stdout is its purpose */
// Communication Phase 8 — realtime load & recovery harness (isolated environments only).
//
//   node test/load/realtime-load.mjs <tokens.json> <baseA> <baseB> <users> <messages> [redisContainer]
//
// 1. Connects <users> customers (half to A, half to B); the first 10 % also
//    connect a second device to the OTHER instance (multi-device).
// 2. Sends <messages> messages via REST (merchants, spread over conversations)
//    and measures send→socket delivery latency per device, duplicates and losses.
// 3. Reconnection storm: all sockets disconnect and reconnect at once.
// 4. Optional Redis interruption (docker pause/unpause): messages sent during the
//    outage must arrive once Redis is back, or be recovered via REST
//    `afterSequence` gap-fill — none may be lost.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { io } = require("socket.io-client");

const [, , tokensPath, baseA, baseB, usersArg, messagesArg, redisContainer] = process.argv;
const data = JSON.parse(readFileSync(tokensPath, "utf8"));
const USERS = Number(usersArg ?? 200);
const MESSAGES = Number(messagesArg ?? 200);
const threads = data.threads.slice(0, USERS);
const pct = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)].toFixed(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const devices = []; // { thread, socket, received: Map<messageId, count> }
function connect(thread, base) {
  return new Promise((resolve, reject) => {
    const socket = io(`${base}/chat`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      auth: { token: thread.customer.token },
      extraHeaders: { Origin: "http://127.0.0.1:3100" },
    });
    const device = { thread, base, socket, received: new Map(), latencies: [] };
    socket.on("message:new", (payload) => {
      const msg = payload?.message ?? payload;
      const id = msg?.id;
      if (!id) return;
      device.received.set(id, (device.received.get(id) ?? 0) + 1);
      const sentAt = sentTimes.get(id);
      if (sentAt && device.received.get(id) === 1) device.latencies.push(Date.now() - sentAt);
    });
    const timer = setTimeout(() => reject(new Error("connect timeout")), 20_000);
    socket.once("session:ready", () => {
      clearTimeout(timer);
      resolve(device);
    });
    socket.once("connect_error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

const sentTimes = new Map(); // messageId -> send completion time
const sentByThread = new Map(); // conversationId -> [{id, sequence}]
async function send(thread, label) {
  const t0 = Date.now();
  const res = await fetch(`${baseA}/api/v1/chat/conversations/${thread.conversationId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${thread.merchant.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientMessageId: randomUUID(), type: "TEXT", content: `rt ${label}` }),
  });
  if (res.status !== 201) throw new Error(`send ${res.status}`);
  const { data: msg } = await res.json();
  sentTimes.set(msg.id, t0);
  const list = sentByThread.get(thread.conversationId) ?? [];
  list.push({ id: msg.id, sequence: msg.sequence });
  sentByThread.set(thread.conversationId, list);
  return msg;
}

function deliveryReport(ids) {
  let expected = 0,
    delivered = 0,
    duplicates = 0;
  const lat = [];
  for (const d of devices) {
    const mine = (sentByThread.get(d.thread.conversationId) ?? []).filter((m) => ids.has(m.id));
    for (const m of mine) {
      expected += 1;
      const n = d.received.get(m.id) ?? 0;
      if (n >= 1) delivered += 1;
      if (n > 1) duplicates += n - 1;
    }
    lat.push(...d.latencies);
  }
  return {
    expected,
    delivered,
    missingViaSocket: expected - delivered,
    duplicates,
    p50: pct(lat, 50),
    p95: pct(lat, 95),
    p99: pct(lat, 99),
    max: lat.length ? Math.max(...lat) : null,
  };
}

// 1. Connect.
let t0 = Date.now();
const connectErrors = [];
for (let i = 0; i < threads.length; i += 25) {
  const batch = threads
    .slice(i, i + 25)
    .map((t, j) =>
      connect(t, (i + j) % 2 === 0 ? baseA : baseB).catch((e) =>
        connectErrors.push(String(e.message)),
      ),
    );
  for (const d of await Promise.all(batch)) if (d && d.socket) devices.push(d);
}
const multi = threads.slice(0, Math.ceil(USERS * 0.1));
for (const t of multi) {
  const first = devices.find((d) => d.thread === t);
  const d = await connect(t, first?.base === baseA ? baseB : baseA).catch((e) =>
    connectErrors.push(String(e.message)),
  );
  if (d && d.socket) devices.push(d);
}
const connectSeconds = (Date.now() - t0) / 1000;

// 2. Messages (bounded concurrency 10).
t0 = Date.now();
const phase1 = new Set();
let sendErrors = 0;
for (let i = 0; i < MESSAGES; i += 10) {
  const sends = Array.from({ length: Math.min(10, MESSAGES - i) }, (_, j) =>
    send(threads[(i + j) % threads.length], `p1-${i + j}`)
      .then((m) => phase1.add(m.id))
      .catch(() => {
        sendErrors += 1;
      }),
  );
  await Promise.all(sends);
}
const sendSeconds = (Date.now() - t0) / 1000;
// Wait until every expected delivery arrived (or 60 s), recording when that happened.
const sendEnd = Date.now();
let delivery = deliveryReport(phase1);
let allDeliveredAfterSeconds = null;
for (let waited = 0; waited < 60_000; waited += 1000) {
  await sleep(1000);
  delivery = deliveryReport(phase1);
  if (delivery.missingViaSocket === 0) {
    allDeliveredAfterSeconds = (Date.now() - sendEnd) / 1000;
    break;
  }
}
delivery = { ...delivery, allDeliveredSecondsAfterLastSend: allDeliveredAfterSeconds };

// 3. Reconnection storm.
for (const d of devices) d.socket.disconnect();
await sleep(500);
t0 = Date.now();
const stormErrors = [];
const reconnected = await Promise.all(
  devices.map((d) =>
    connect(d.thread, d.base).catch((e) => {
      stormErrors.push(String(e.message));
      return null;
    }),
  ),
);
const stormSeconds = (Date.now() - t0) / 1000;
devices.splice(0, devices.length, ...reconnected.filter(Boolean));

// 4. Redis interruption with recovery.
let redis = null;
if (redisContainer) {
  execFileSync("docker", ["pause", redisContainer]);
  const phase2 = new Set();
  const outageSends = [];
  try {
    for (let i = 0; i < 20; i += 1)
      outageSends.push(
        send(threads[i % threads.length], `p2-${i}`)
          .then((m) => phase2.add(m.id))
          .catch(() => {}),
      );
    await Promise.all(outageSends);
    await sleep(10_000);
  } finally {
    execFileSync("docker", ["unpause", redisContainer]);
  }
  await sleep(15_000); // probe recovery + outbox retry
  const socketPhase2 = deliveryReport(phase2);
  // Gap-fill every affected conversation from its last pre-outage sequence.
  let recoveredViaRest = 0,
    stillMissing = 0;
  for (const d of devices) {
    const mine = (sentByThread.get(d.thread.conversationId) ?? []).filter((m) => phase2.has(m.id));
    const missing = mine.filter((m) => !d.received.has(m.id));
    if (!missing.length) continue;
    const after =
      BigInt(
        missing.reduce(
          (min, m) => (BigInt(m.sequence) < min ? BigInt(m.sequence) : min),
          BigInt(missing[0].sequence),
        ),
      ) - 1n;
    const res = await fetch(
      `${baseA}/api/v1/chat/conversations/${d.thread.conversationId}/messages?afterSequence=${after}&limit=100`,
      { headers: { Authorization: `Bearer ${d.thread.customer.token}` } },
    );
    const items = (await res.json()).data.items.map((m) => m.id);
    for (const m of missing) {
      if (items.includes(m.id)) recoveredViaRest += 1;
      else stillMissing += 1;
    }
  }
  redis = {
    sentDuringOutage: phase2.size,
    socket: socketPhase2,
    recoveredViaRest,
    lost: stillMissing,
  };
}

for (const d of devices) d.socket.close();
console.log(
  JSON.stringify(
    {
      users: USERS,
      devices: devices.length,
      multiDeviceUsers: multi.length,
      connect: {
        seconds: connectSeconds,
        errors: connectErrors.length,
        sampleErrors: connectErrors.slice(0, 3),
      },
      send: {
        messages: MESSAGES,
        seconds: sendSeconds,
        perSecond: +(MESSAGES / sendSeconds).toFixed(1),
        errors: sendErrors,
      },
      delivery,
      reconnectStorm: {
        sockets: reconnected.length,
        seconds: stormSeconds,
        errors: stormErrors.length,
        sampleErrors: stormErrors.slice(0, 3),
      },
      redisInterruption: redis,
    },
    null,
    1,
  ),
);
process.exit(0);
