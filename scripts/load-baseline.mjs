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
// Phase 10: the limiter is per-identity and authenticated identity is the
// user id (`resolveIdentity`), so one token shares one budget across all 200
// requests (parcel-list 120/min, analytics/intelligence 60/min, create
// 30/min) and the run would measure 429s instead of the endpoints. Rotate
// across the three seeded accounts (merchant, merchant2, admin — all
// role-allowed on every scenario below) so each identity stays under budget.
// `X-Forwarded-For` rotation is kept as belt-and-braces for any
// unauthenticated path; it is inert on authed routes by design.
let ipCounter = 0;
const clientIp = () => `198.51.100.${(ipCounter += 1) % 250 + 1}`;
async function runScenario(name, buildRequest, { concurrency = CONCURRENCY, count = REQS_PER_SCENARIO } = {}) {
  const latencies = [];
  let errors = 0;
  let ok = 0;
  let throttled = 0;
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
        if (res.status === 429) throttled++;
        else if (res.status >= 500) errors++;
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
    throttled,
    errors,
    errorRate: Math.round((errors / count) * 1000) / 10,
    throughputRps: Math.round((count / elapsedSec) * 10) / 10,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

const merchantToken = await loginAs("merchant@dhruto.com");
const merchant2Token = await loginAs("merchant2@dhruto.com");
const adminToken = await loginAs("admin@dhruto.com");
// Round-robin across identities; per-identity math per scenario:
// parcel-list 200/3 ≈ 67 < 120, create 60/3 = 20 < 30,
// overview + parse 150/3 = 50 < 60. Counts are budget-derived, not arbitrary.
const tokens = [merchantToken, merchant2Token, adminToken];
const tokenFor = (i) => tokens[i % tokens.length];
const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
// Distinct-client header merged per request (see clientIp note above).
const asClient = (headers) => ({ ...headers, "X-Forwarded-For": clientIp() });

const results = [];
results.push(await runScenario("health", () => ({ url: "http://localhost:4000/health", init: {} }), { count: 200 }));
results.push(await runScenario("login", (i) => ({
  url: `${BASE}/auth/login`,
  init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailOrPhone: "merchant@dhruto.com", password: "dhruto123" }) },
  // NOTE: login is bcrypt-bound (~2s, CPU-synchronous). Hammering it melts
  // the event loop on small hardware, so this scenario stays tiny; it
  // measures single-login latency, not login throughput.
}), { count: 5, concurrency: 1 }));
// NOTE: the admin third of parcel-list reads the unscoped (all-merchant)
// query — same endpoint, marginally heavier shape; acceptable for a baseline.
results.push(await runScenario("parcel-list", (i) => ({
  url: `${BASE}/parcels?page=1&limit=20`, init: { headers: asClient(auth(tokenFor(i))) },
})));
results.push(await runScenario("parcel-create", (i) => ({
  url: `${BASE}/parcels`,
  init: {
    method: "POST",
    headers: asClient({ ...auth(tokenFor(i)), "Idempotency-Key": `load-${Date.now()}-${(idemCounter += 1)}-${i}` }),
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
results.push(await runScenario("analytics-overview", (i) => ({
  url: `${BASE}/analytics/overview?preset=30d`, init: { headers: asClient(auth(tokenFor(i))) },
}), { count: 150 }));
results.push(await runScenario("intelligence-parse", (i) => ({
  url: `${BASE}/intelligence/address/parse`,
  init: { method: "POST", headers: asClient(auth(tokenFor(i))), body: JSON.stringify({ rawAddress: "House 12, Road 4, Uttara, Dhaka-1230" }) },
}), { count: 150 }));

console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

// Phase 10: reference verdict against the parcel-list target
// (docs/audit/pagination/parcel-list.md §14: p95 < 300ms @ 250RPS staging
// goal). Informational only — exit code unchanged.
{
  const list = results.find((r) => r.scenario === "parcel-list");
  const verdict = {
    target: "parcel-list p95 < 300ms, 0 errors, 0 throttled",
    p95: list?.p95 ?? null,
    met: (list?.p95 ?? Infinity) < 300 && (list?.errors ?? 1) === 0 && (list?.throttled ?? 1) === 0,
  };
  console.log(JSON.stringify({ verdict }, null, 2));
  const anyThrottled = results.filter((r) => r.throttled > 0).map((r) => r.scenario);
  if (anyThrottled.length > 0) {
    console.log(`NOTE: throttled (429) responses observed in: ${anyThrottled.join(", ")} — identity rotation may need widening.`);
  }
}
