/**
 * Phase 8 baseline load harness (no new dependencies — plain Node fetch).
 *
 * Usage: node scripts/load-baseline.mjs [baseUrl] [concurrency]
 * Requires: API running, seeded DB (merchant/admin dhruto123).
 * Prints P50/P95/P99 + throughput + errors per scenario as JSON.
 */
const BASE = process.argv[2] ?? "http://localhost:4000/api/v1";
const CONCURRENCY = Number(process.argv[3] ?? 25);
const REQS_PER_SCENARIO = 200;

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, idx)] * 10) / 10;
}

async function loginAs(emailOrPhone) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrPhone, password: "dhruto123" }),
  });
  if (!res.ok) throw new Error(`login ${emailOrPhone} -> ${res.status}`);
  const body = await res.json();
  return body.data.tokens.accessToken;
}

let idemCounter = 0;
async function runScenario(name, buildRequest, { concurrency = CONCURRENCY, count = REQS_PER_SCENARIO } = {}) {
  const latencies = [];
  let errors = 0;
  let ok = 0;
  const started = performance.now();
  let launched = 0;

  async function worker() {
    while (true) {
      const i = launched++;
      if (i >= count) return;
      const req = buildRequest(i);
      const t0 = performance.now();
      try {
        const res = await fetch(req.url, req.init);
        // Drain body so timing includes transfer.
        await res.arrayBuffer();
        if (res.status >= 500) errors++;
        else ok++;
      } catch {
        errors++;
      }
      latencies.push(performance.now() - t0);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, () => worker()));
  const elapsedSec = (performance.now() - started) / 1000;
  latencies.sort((a, b) => a - b);
  return {
    scenario: name,
    concurrency,
    requests: count,
    ok,
    errors,
    errorRate: Math.round((errors / count) * 1000) / 10,
    throughputRps: Math.round((count / elapsedSec) * 10) / 10,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

const merchantToken = await loginAs("merchant@dhruto.com");
const adminToken = await loginAs("admin@dhruto.com");
const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const results = [];
results.push(await runScenario("health", () => ({ url: "http://localhost:4000/health", init: {} }), { count: 200 }));
results.push(await runScenario("login", (i) => ({
  url: `${BASE}/auth/login`,
  init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailOrPhone: "merchant@dhruto.com", password: "dhruto123" }) },
  // NOTE: login is bcrypt-bound (~2s, CPU-synchronous). Hammering it melts
  // the event loop on small hardware, so this scenario stays tiny; it
  // measures single-login latency, not login throughput.
}), { count: 5, concurrency: 1 }));
results.push(await runScenario("parcel-list", () => ({
  url: `${BASE}/parcels?page=1&limit=20`, init: { headers: auth(merchantToken) },
})));
results.push(await runScenario("parcel-create", (i) => ({
  url: `${BASE}/parcels`,
  init: {
    method: "POST",
    headers: { ...auth(merchantToken), "Idempotency-Key": `load-${Date.now()}-${(idemCounter += 1)}-${i}` },
    body: JSON.stringify({
      recipientName: "Load Test",
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "House 1, Road 1, Mirpur 10, Dhaka",
      weight: 1,
      codAmount: 500,
    }),
  },
}), { count: 60, concurrency: Math.min(CONCURRENCY, 10) }));
results.push(await runScenario("analytics-overview", () => ({
  url: `${BASE}/analytics/overview?preset=30d`, init: { headers: auth(adminToken) },
})));
results.push(await runScenario("intelligence-parse", () => ({
  url: `${BASE}/intelligence/address/parse`,
  init: { method: "POST", headers: auth(merchantToken), body: JSON.stringify({ rawAddress: "House 12, Road 4, Uttara, Dhaka-1230" }) },
})));

console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
