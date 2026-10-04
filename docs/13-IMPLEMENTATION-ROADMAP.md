# Dhruto — Implementation Roadmap

## Phase 0 — Foundation

### Backend

- Monorepo
- NestJS bootstrap
- Config
- PostgreSQL
- Redis
- Swagger
- Global validation
- Error contract
- Request ID
- Logging
- Auth foundation
- RBAC foundation

### Frontend

- Next.js apps
- Shared UI
- Theme tokens
- API client
- RTK Query
- Auth flow
- Layout system

### Exit Criteria

- all apps build
- API health works
- database migration works
- auth works
- CI works

---

## Phase 1 — Merchant + Parcel Core

### Backend

- merchants
- parcels
- parcel history
- pricing
- idempotency
- labels
- tracking

### Frontend

- merchant dashboard
- create order
- order list
- order details
- tracking
- label print

### Exit Criteria

Merchant can create and track a parcel end-to-end.

---

## Phase 2 — Hub Operations

### Backend

- hubs
- scans
- bags
- manifests
- state transitions
- hub permissions

### Frontend

- scanner
- parcel operations
- bag management
- manifest
- dispatch/receive

### Exit Criteria

A parcel can travel through origin and destination hub workflows.

---

## Phase 3 — Rider Delivery

### Backend

- rider
- assignments
- delivery attempts
- OTP
- COD ledger
- proof of delivery

### Frontend/PWA

- rider dashboard
- tasks
- parcel details
- OTP
- COD
- proof
- failed delivery

### Exit Criteria

Rider can complete a real delivery workflow.

---

## Phase 4 — Finance

### Backend

- wallet
- wallet transactions
- cash reconciliation
- settlements
- payout requests
- concurrency locking
- financial audit

### Frontend

- merchant wallet
- transactions
- payout
- admin reconciliation
- financial reports

### Exit Criteria

COD can be reconciled and merchant settlement is correct and auditable.

---

## Phase 5 — Notifications + Integrations

- SMS
- email
- in-app notifications
- webhooks
- queue workers
- retry/dead-letter handling

---

## Phase 6 — Intelligence

- address parser
- district/thana matching
- confidence scoring
- recipient risk score
- RTO prediction
- operational recommendations

---

## Phase 7 — Analytics

- operational dashboard
- merchant analytics
- hub throughput
- rider performance
- RTO analytics
- COD analytics
- financial analytics

---

## Phase 8 — Scale and Optimization

- load testing
- DB query optimization
- cache optimization
- queue optimization
- horizontal scaling
- observability
- disaster recovery

---

## Implementation Rule

Do not start advanced AI, route optimization, or complex analytics before the transactional core is stable.

The priority order is:

```text
Correctness
→ Security
→ Maintainability
→ Observability
→ Performance
→ Advanced Intelligence
```

## Feature Delivery Checklist

Every feature must answer:

1. What business problem does it solve?
2. Who can use it?
3. What API is required?
4. What DB changes are required?
5. What state transitions are involved?
6. What validation is required?
7. What financial impact exists?
8. What audit event exists?
9. What notifications exist?
10. What errors can happen?
11. What tests are required?
12. What frontend states exist?
13. What performance risks exist?
14. What documentation must change?

## Final MVP Gate

MVP cannot be considered production-ready until:

- critical E2E journeys pass
- state machine tests pass
- financial concurrency tests pass
- idempotency tests pass
- security checks pass
- load-test baseline is recorded
- backup/restore is tested
- monitoring is active
- audit logs are verified
- API documentation matches implementation
