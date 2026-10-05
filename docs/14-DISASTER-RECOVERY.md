# Dhruto — Disaster Recovery & High-Availability Runbook

## 1. Objectives & SLA Targets

| Metric | Target | Definition |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 15 minutes** | Maximum allowable data loss measured in time preceding an incident |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Maximum allowable downtime before core services are restored |
| **Service Availability SLA** | **99.9%** | Multi-region resilient container and database architecture |

---

## 2. Architecture & Redundancy

```text
               ┌──────────────────────────────┐
               │    CloudFlare / Edge CDN     │
               │  DDoS Protection & SSL/TLS   │
               └──────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │  Application Load Balancer   │
              │  Active Health Probe Check    │
              └───────┬───────────────┬───────┘
                      │               │
        ┌─────────────┴──────┐ ┌──────┴─────────────┐
        │  API Pod 1 (Primary)│ │  API Pod 2 (Replica)│
        │  Container Liveness │ │  Container Liveness │
        └─────────────┬──────┘ └──────┬─────────────┘
                      │               │
                      ├───────────────┤
                      │               │
       ┌──────────────┴──────┐ ┌──────┴─────────────┐
       │   PostgreSQL Master  │ │  PostgreSQL Standby │
       │   (Write Node)       │ │  (Read Replica)     │
       └──────────────┬──────┘ └────────────────────┘
                      │
       ┌──────────────┴──────┐
       │  S3 / Object Store  │
       │  WAL Archives & Dumps│
       └─────────────────────┘
```

---

## 3. High-Frequency Backup Strategy

### A. Snapshot Frequency
1. **Continuous WAL Streaming**: PostgreSQL Write-Ahead Logs (WAL) streamed continuously to distributed object storage.
2. **Scheduled Full Backups**: Automated full daily backups with SHA-256 checksum verification via `scripts/backup-db.mjs`.
3. **Retention Policy**:
   - Hourly incremental checkpoints: Retained for 72 hours.
   - Daily full backups: Retained for 30 days.
   - Monthly compliance archives: Retained for 1 year.

### B. Integrity Verification Drill
Run regular restore drills:
```bash
node scripts/backup-db.mjs
node scripts/restore-db.mjs
```

---

## 4. Incident Response & Failover Runbook

### Scenario A: PostgreSQL Primary Database Unresponsive
1. **Detection**:
   - `/health/readiness` fails with `checks.database: "unhealthy"`.
   - Alert triggers on Prometheus / Datadog.
2. **Automated Action**:
   - Read replica is promoted to primary node.
   - Connection pool points to promoted primary.
3. **Recovery Verification**:
   - Verify `GET /health/readiness` returns status `"ready"`.
   - Run verification query: `SELECT count(*) FROM parcels;`.

### Scenario B: Redis Cache Unavailability
1. **Automatic Resilience**:
   - API automatically falls back to in-memory TTL/LRU caching with 0 downtime.
   - `GET /health/metrics` reports `cache.driver: "memory-fallback"`.
   - No financial data is corrupted (authoritative state resides strictly in PostgreSQL).

### Scenario C: Regional Datacenter Outage
1. **DNS Failover**:
   - Cloudflare edge shifts traffic to secondary disaster recovery region.
   - Docker containers bootstrap with environment variables and connect to promoted replica.
2. **Total RTO**: ~12 minutes (well under the 30-minute target).

---

## 5. Rollback Procedures

If a newly deployed migration or code release exhibits critical degradation:

1. **Application Rollback**:
   - Roll back Kubernetes deployment or container tag to previous stable image.
2. **Database Schema Rollback**:
   - Reverse migration using TypeORM migration runner or restore pre-migration snapshot:
   ```bash
   node scripts/restore-db.mjs
   ```
3. **Post-Incident Verification**:
   - Run `npx tsx scripts/load-test.ts` to ensure 250+ RPS and p95 < 300ms.
