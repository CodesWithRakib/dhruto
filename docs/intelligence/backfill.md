# Backfill

Idempotent, resumable, chunked procedures for existing data:

1. **Geography** — `POST /admin/intelligence/geography/import` (code-keyed
   upserts; safe to re-run).
2. **Parses** — re-run `POST /intelligence/address/parse` per parcel (or
   script over parcels in `createdAt` chunks of ~500); rows append with new
   versions, originals untouched.
3. **Features/risk** — first `GET /intelligence/parcels/:id/intelligence`
   computes and persists snapshots on demand.
4. **RTO outcomes** — converge automatically on read; rider completions label
   immediately.

All backfills insert intelligence rows only. Never update business tables,
never rewrite history, never run destructively in production without a
snapshot. Report progress per chunk; failures retry the chunk.
