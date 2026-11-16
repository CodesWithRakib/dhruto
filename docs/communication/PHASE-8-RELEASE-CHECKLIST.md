# Communication Platform — Phase 8 Release Checklist

**No step here was executed against staging or production in Phase 8.** Never deploy automatically; never use production credentials without explicit approval.

## 0. Gates (all required before staging sign-off)

- [ ] D-13: Next.js ≥ 16.4.1 and other advisories addressed; full web + API regression green
- [ ] D-1, D-2, D-3, D-4, D-9, D-10 decided and recorded (`PHASE-8-PRODUCT-DECISIONS.md`)
- [ ] API deployment definition exists (container image/process manager), with the BullMQ workers it runs in-process
- [ ] Ingress restricts `/health/*` and `/system/*` to the internal network (F-4)

## 1. Staging

1. **Infrastructure**
   - [ ] PostgreSQL 16 with WAL archiving; `max_connections` ≥ instances × `DB_POOL_MAX` + headroom
   - [ ] Redis with TLS + auth (`rediss://`), AOF optional
   - [ ] Dedicated **non-production** bucket, private, CORS for the staging web origin, IAM scoped to `chat/*` (`PHASE-6-OPERATIONS.md` §2)
   - [ ] clamd from `deploy/clamav/docker-compose.clamav.yml` on a private network; healthy; outbound HTTPS for freshclam
2. **Configuration** (secret manager, never files in git)
   - [ ] `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (unique per environment)
   - [ ] `CORS_ORIGIN`, `WS_CORS_ORIGINS` = staging web origin only
   - [ ] `CHAT_STORAGE_BUCKET`, `CHAT_STORAGE_REGION`, (`CHAT_STORAGE_ENDPOINT`, `CHAT_STORAGE_PUBLIC_ENDPOINT`, `CHAT_STORAGE_FORCE_PATH_STYLE`), credentials or instance role
   - [ ] `CHAT_CLAMAV_HOST=clamav`, `CHAT_CLAMAV_PORT=3310`, `CHAT_CLAMAV_TIMEOUT_MS=30000`, `CHAT_CLAMAV_SIGNATURE_MAX_AGE_HOURS=48`
   - [ ] Scan tunables (`CHAT_MALWARE_SCAN_*`) at defaults unless the backlog test says otherwise
   - [ ] Retention durations **unset** until D-1 approval
   - [ ] `NEXT_PUBLIC_API_URL` at web build time; CSP decision (D-12) applied, including API + storage origins
3. **Database**
   - [ ] Verified backup taken and restore-tested (`PHASE-8-BACKUP-RECOVERY.md`)
   - [ ] `delivery_otp_code` drift resolved by the platform team (separate, approved change)
   - [ ] Migrations 0010 → 0011 → 0012 per `PHASE-8-MIGRATION-ROLLOUT.md`, with pre/post checks
4. **Deploy** API and web together (API first is acceptable; old bundles fail closed, `PHASE-8-API-COMPATIBILITY.md`)
5. **Verify**
   - [ ] `/health/readiness` 200; `/health/chat` `status: ok`; Prometheus shows `dhruto_chat_*`
   - [ ] Backlog drains (`scan_pending → 0`), no FAILED spike
   - [ ] Storage provider suite (`PHASE-8-STORAGE-VERIFICATION.md`) green against the staging bucket
   - [ ] Phase 6 + Phase 7 + responsive/a11y Playwright suites on Chromium, Firefox, WebKit
   - [ ] Load profiles on staging hardware; compare with approved targets (D-9)
   - [ ] Alerts from the runbook fire in a test (stop clamd; pause Redis)
   - [ ] Grants issued to named holders with expiry (D-2)

## 2. Production

1. [ ] Change approval with the staging evidence attached; maintenance window if the backlog will block attachments for a noticeable time (D-5)
2. [ ] Fresh verified backup + object-storage versioning on
3. [ ] Infrastructure and configuration as staging, production values only
4. [ ] Migrations per rollout doc; watch lock waits
5. [ ] Deploy API, then web; confirm readiness on every instance
6. [ ] Post-deploy verification as staging §5 (smoke subset: login per role, send message, upload → CLEAN → download, admin center opens, internal note invisible to a participant)
7. [ ] Monitor alerts for 24 h; backlog fully drained

## 3. Rollback

| Situation                                   | Action                                                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web regression                              | Redeploy previous web build (API compatible: new fields are additive)                                                                                                                                          |
| API regression, schema unchanged            | Redeploy previous API build                                                                                                                                                                                    |
| After 0012, need to go back to Phase 6 code | Previous code ignores Phase 7 columns, **but** downloads would no longer be scan-gated: do not roll back past Phase 7 code in production without a security decision. Prefer a forward fix.                    |
| Migration failure mid-way                   | Each statement is idempotent; fix and re-run `up`. `down` of 0012 drops escalation state, scan results and grants; `down` of 0010 destroys all chat data — **only** with a fresh backup and explicit approval. |
| clamd failure                               | No rollback needed: files stay pending; restore clamd                                                                                                                                                          |
