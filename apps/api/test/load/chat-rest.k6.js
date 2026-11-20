// Communication Phase 8 — REST load profile (k6). Isolated environments only.
//
//   docker run --rm -v <dir>:/work -e BASES=http://host.docker.internal:4201,http://host.docker.internal:4202 \
//     -e PROFILE=baseline grafana/k6 run /work/chat-rest.k6.js
//
// Inputs: /work/load-tokens.json from seed-load.mjs. PROFILE = baseline | ramp | burst | sustained.
// Requests are tagged by endpoint (`name`) so percentiles are reported per endpoint.
// No thresholds: proposed targets live in PHASE-8-LOAD-TEST-REPORT.md and need approval.
/* global __ENV, open -- k6 runtime globals (not Node), provided by the k6 engine */
import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";
import { randomString } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const data = JSON.parse(open("/work/load-tokens.json"));
const threads = new SharedArray("threads", () => data.threads);
const adminToken = data.admin.token;
const bases = (__ENV.BASES || "http://host.docker.internal:4201").split(",");

const PROFILES = {
  baseline: { executor: "constant-vus", vus: 10, duration: "60s" },
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "45s", target: 50 },
      { duration: "45s", target: 100 },
      { duration: "45s", target: 200 },
      { duration: "45s", target: 200 },
      { duration: "15s", target: 0 },
    ],
  },
  burst: { executor: "constant-vus", vus: 400, duration: "30s" },
  sustained: { executor: "constant-vus", vus: 50, duration: "5m" },
  // Phase 8 profiles sized for a single-workstation run (the 200-VU ramp exhausted the
  // Docker VM, see PHASE-8-LOAD-TEST-REPORT.md). Use the larger profiles on staging hardware.
  ramplite: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "40s", target: 10 },
      { duration: "40s", target: 25 },
      { duration: "40s", target: 50 },
      { duration: "30s", target: 50 },
      { duration: "10s", target: 0 },
    ],
  },
  burstlite: { executor: "constant-vus", vus: 75, duration: "30s" },
  sustainedlite: { executor: "constant-vus", vus: 30, duration: "3m" },
};

const ENDPOINTS = [
  "inbox",
  "history",
  "send",
  "unread",
  "search",
  "download_auth",
  "detail",
  "admin_inbox",
  "admin_metrics",
  "admin_audit",
];

export const options = {
  scenarios: { chat: PROFILES[__ENV.PROFILE || "baseline"] },
  // Always-true thresholds only make k6 report per-endpoint sub-metrics; they are NOT targets.
  thresholds: Object.fromEntries(
    ENDPOINTS.map((n) => [`http_req_duration{name:${n}}`, ["max>=0"]]),
  ),
  summaryTrendStats: ["avg", "p(50)", "p(95)", "p(99)", "max"],
  discardResponseBodies: true,
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const t = pick(threads);
  const who = pick([t.merchant, t.rider, t.customer]);
  const base = pick(bases);
  const h = {
    headers: { Authorization: `Bearer ${who.token}`, "Content-Type": "application/json" },
  };
  const r = Math.random();
  let res;
  if (r < 0.3) {
    res = http.get(`${base}/api/v1/chat/conversations?limit=20`, { ...h, tags: { name: "inbox" } });
  } else if (r < 0.55) {
    res = http.get(`${base}/api/v1/chat/conversations/${t.conversationId}/messages?limit=50`, {
      ...h,
      tags: { name: "history" },
    });
  } else if (r < 0.7) {
    res = http.post(
      `${base}/api/v1/chat/conversations/${t.conversationId}/messages`,
      JSON.stringify({
        clientMessageId: uuid(),
        type: "TEXT",
        content: `load ${randomString(12)}`,
      }),
      { ...h, tags: { name: "send" } },
    );
  } else if (r < 0.8) {
    res = http.get(`${base}/api/v1/chat/conversations/unread-summary`, {
      ...h,
      tags: { name: "unread" },
    });
  } else if (r < 0.85) {
    res = http.get(`${base}/api/v1/chat/search?q=delivery&limit=20`, {
      ...h,
      tags: { name: "search" },
    });
  } else if (r < 0.9) {
    res = http.get(`${base}/api/v1/chat/attachments/${t.attachmentId}/download`, {
      ...h,
      tags: { name: "download_auth" },
    });
  } else if (r < 0.95) {
    res = http.get(`${base}/api/v1/chat/conversations/${t.conversationId}`, {
      ...h,
      tags: { name: "detail" },
    });
  } else {
    const admin = { headers: { Authorization: `Bearer ${adminToken}` } };
    const a = Math.random();
    res =
      a < 0.5
        ? http.get(`${base}/api/v1/chat/admin/inbox?limit=25`, {
            ...admin,
            tags: { name: "admin_inbox" },
          })
        : a < 0.8
          ? http.get(`${base}/api/v1/chat/admin/metrics`, {
              ...admin,
              tags: { name: "admin_metrics" },
            })
          : http.get(`${base}/api/v1/chat/admin/audit-logs?limit=25`, {
              ...admin,
              tags: { name: "admin_audit" },
            });
  }
  check(res, { "2xx": (x) => x.status >= 200 && x.status < 300 });
}

function uuid() {
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
    else if (i === 14) s += "4";
    else if (i === 19) s += h[(Math.random() * 4) | 8];
    else s += h[(Math.random() * 16) | 0];
  }
  return s;
}

export function handleSummary(summary) {
  const out = { profile: __ENV.PROFILE || "baseline", metrics: {} };
  for (const [k, v] of Object.entries(summary.metrics)) {
    if (
      k.startsWith("http_req_duration{name:") ||
      k === "http_req_duration" ||
      k === "http_reqs" ||
      k === "http_req_failed" ||
      k === "checks" ||
      k === "vus_max" ||
      k === "iterations"
    ) {
      out.metrics[k] = v.values;
    }
  }
  return { [`/work/k6-${out.profile}.json`]: JSON.stringify(out, null, 1), stdout: "" };
}
