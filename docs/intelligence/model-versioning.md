# Model Versioning, Privacy, Backfill & Ops

## Versions

- Parser `address-parser-v1.0`, dataset `bd-geo-2026-10`, risk `rule-risk-v1`,
  RTO `rule-based-rto-v1` (type `RULE_BASED`), features `features-v1`.
- Every parse/risk/prediction row carries its versions; `GET
  /intelligence/health` and `GET /admin/intelligence/versions` expose the
  active set. Bump versions only with a documented change; old rows stay
  reproducible.

## Privacy & retention

Phones are HMAC-hashed with `INTELLIGENCE_PHONE_PEPPER` (falls back to the
JWT secret in dev). Raw numbers never enter intelligence tables, logs or
caches. Structured logs carry `requestId/actorId/versions` only. Retention:
risk/RTO snapshots and feedback are operational records — aggregate before
deleting, and never delete financially relevant history casually.

## Backfill

Safe, resumable, chunked, idempotent:

1. `POST /admin/intelligence/geography/import` — dataset (re-runnable).
2. Seed (`pnpm seed`) — relational fixtures with real attempt histories.
3. Outcome convergence — rider completion labels immediately; intelligence
   reads converge hub-finalized RTOs; repeat reads are no-ops once labeled.
4. Address reprocessing — re-run `parse` with `parcelId`; originals preserved,
   new rows versioned (never update old rows in place).

Run backfills off-peak; they only insert intelligence rows, never touch
business tables.

## Observability

Metrics (`GET /admin/intelligence/metrics`): parses, low-confidence parses,
confirmations, risk snapshots, high-risk count, predictions, labeled outcomes,
overrides. Logs: `ADDRESS_CONFIRMED`, `RECOMMENDATION_OVERRIDDEN`, parse
cache/persist warnings — no PII. These feed Phase 7 analytics
(accuracy, correction rate, precision/recall, acceptance rate).

## Fail-safe

Redis down → uncached compute + inline persist attempts. Intelligence tables
unreachable → endpoints return `*_UNAVAILABLE` while parcel booking (legacy
`analyzeBooking` is best-effort try/catch) continues. Advisory failures never
block transactions.

## Future ML path

Implement `RiskScorerEngine` / `RtoPredictorEngine` / `AddressParserEngine`
(e.g. `MlBasedRtoEngine`), register the version in `scoring_models`, flip the
single ACTIVE row. Contracts, tables, APIs and UI already speak versions.
