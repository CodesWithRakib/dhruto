# Parcel List (merchant + admin) — Data Spec

1. **Goal:** find + triage shipments (merchant: my parcels; admin: all).
2. **Columns:** tracking (copy) | recipient name + masked phone | district/thana | COD ৳ | status badge (`status.ts`) | current hub/rider | updated (`Asia/Dhaka`). Admin adds merchant. NEW: RTO-risk dot (from intel, if permitted).
3. **Optional:** weight, fee, attempts count.
4. **Search:** tracking exact-prefix, recipient name/phone (merchant-scoped; admin all). Min 2 chars, 300ms debounce, `/` shortcut.
5. **Filters:** status tabs (6) + district + thana + date range (default last 30d? confirm) + clear-all. **Sort:** `createdAt DESC` default; allow `codAsc/Desc`, `status`, `district`.
6. **Strategy:** Offset default (`page/limit20/total`); cursor opt (`mode=cursor`, `nextCursor`, no total) for deep/export. Justify in `10§1`.
7. **Page-size:** 10/20/50; URL `?page&limit&sort&order&status&search&district&thana&from&to`.
8. **Counts:** offset total required (tabs show counts — verify query cost).
9. **Summaries:** in-transit / delivered-today / failed-attention chips (reuse dashboard overview).
10. **Actions:** merchant Create (list header); row View/Label; (NEW) bulk export CSV (perm-gated) — list-page bulk, not sidebar.
11. **Export:** merchant-scoped CSV; admin full (ADMIN only). No PII beyond masked phone unless perm.
12. **States:** table skeleton + card skeletons (mobile) → filtered-empty (`SearchX+clear`) vs none (`Package+create`) → error + Retry.
13. **Backend:** `GET /parcels` tenant-first scope → filters → sort allowlist → paginate; keep Phase8 `(merchant,status,createdAt DESC)`; cursor needs `(createdAt DESC, id DESC)` (verify exists).
14. **Acceptance:** deep-link preserves filters; out-of-range → last page; cross-tenant denied (e2e); p95 list <300ms @250RPS target (see `13`).
