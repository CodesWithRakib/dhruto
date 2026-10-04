# Dhruto — Deployment and Operations

## 1. Environments

```text
local
development
staging
production
```

Production must not share credentials or databases with lower environments.

## 2. Services

Minimum production components:

```text
web-admin
web-merchant
tracker
api
worker
postgres
redis
object storage
```

## 3. Environment Variables

Examples:

```text
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
SMS_PROVIDER_KEY
EMAIL_PROVIDER_KEY
PAYMENT_PROVIDER_KEY
```

Secrets must never be committed.

## 4. Database

Production database must have:

- automated backups
- migration strategy
- point-in-time recovery where available
- monitoring
- connection pooling
- slow-query monitoring

## 5. Redis

Use for:

- cache
- queue
- rate limiting

Do not store authoritative financial state only in Redis.

## 6. Worker

Worker must run independently from HTTP API so queue workloads cannot starve API capacity.

## 7. CI/CD

Pipeline:

```text
Pull Request
→ lint
→ typecheck
→ tests
→ build
→ security checks
→ review
→ deploy staging
→ smoke tests
→ production approval
```

## 8. Database Migration Rules

- migrations are version-controlled
- never manually modify production schema without an approved migration
- backward-compatible migrations are preferred
- destructive migrations require explicit rollout planning

## 9. Logging

Use structured JSON logs.

Include:

- timestamp
- level
- service
- request ID
- user ID where safe
- route
- duration
- status
- error code

## 10. Monitoring

Monitor:

- uptime
- API latency
- error rate
- DB connections
- DB latency
- Redis health
- queue depth
- failed jobs
- worker health
- storage failures

## 11. Alerts

Alert on:

- API error spikes
- p95/p99 degradation
- DB unavailable
- Redis unavailable
- queue backlog
- repeated payout failures
- webhook failure spikes
- unusual financial discrepancies

## 12. Backup and Recovery

Define:

- backup frequency
- retention
- restore procedure
- disaster recovery owner
- RPO
- RTO

Initial targets must be agreed before production launch.

## 13. Health Endpoints

At minimum:

```text
GET /health
GET /health/readiness
GET /health/liveness
```

Readiness must verify dependencies required for serving traffic.

## 14. Rollback

Application deployment must support rollback.

Database rollback should use forward-compatible corrective migrations where possible.
