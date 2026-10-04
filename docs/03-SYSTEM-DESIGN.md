# Dhruto — System Design

## 1. Architecture

```text
Merchant Web ─────┐
Admin Web ────────┼──→ NestJS API ──→ PostgreSQL
Rider PWA ────────┤         │
Tracker ──────────┘         ├──→ Redis
                            ├──→ BullMQ/Redis
                            ├──→ WebSocket
                            └──→ External Providers
```

## 2. Recommended Monorepo

```text
dhruto/
├── apps/
│   ├── api/
│   ├── web-admin/
│   ├── web-merchant/
│   └── tracker/
├── packages/
│   ├── types/
│   ├── config/
│   ├── eslint-config/
│   ├── ui/
│   └── validation/
└── docs/
```

## 3. Backend Responsibilities

NestJS API owns:

- authentication
- authorization
- business rules
- state transitions
- financial transactions
- pricing
- tracking
- integrations
- audit
- queue publishing

Workers own:

- SMS
- email
- webhooks
- long-running imports
- payout processing where applicable
- reports
- other asynchronous jobs

## 4. Data Stores

### PostgreSQL

Source of truth for:

- users
- merchants
- parcels
- financial ledgers
- hubs
- riders
- pricing
- audit

### Redis

Used for:

- public tracking cache
- rate limiting
- queue backend
- short-lived distributed state
- optional session/cache use cases

### Object Storage

Used for:

- delivery proof
- import files
- generated reports
- other non-relational assets

## 5. API Communication

All frontend applications communicate through documented HTTP APIs.

Realtime events use WebSocket where useful.

Long-running work returns an accepted/job reference rather than blocking the request.

## 6. Transaction Boundaries

Transactions are mandatory for:

- parcel creation plus related financial/reservation records
- delivery completion plus COD ledger creation
- merchant wallet balance changes
- payout creation
- rider cash verification
- state transitions with required side effects

## 7. Concurrency

Financial rows must use pessimistic locking where required.

Do not rely on:

```text
read balance → calculate → write balance
```

without locking.

Use:

```text
BEGIN
→ SELECT ... FOR UPDATE
→ validate
→ insert ledger
→ update balance projection if used
→ COMMIT
```

## 8. Caching

Public tracking:

```text
key = tracking:{trackingCode}
TTL = 60 seconds
```

Cache invalidation should occur after relevant parcel status mutations.

## 9. Queue Architecture

Example queues:

- notifications
- webhooks
- bulk-import
- labels
- payouts
- reports

Each job needs:

- unique job identity
- retry policy
- exponential backoff where appropriate
- dead-letter/failure handling
- structured logs

## 10. Observability

Every request receives a request ID.

Metrics:

- request count
- latency
- p50/p95/p99
- error rate
- DB query latency
- queue delay
- job failure rate
- cache hit rate

## 11. Failure Strategy

External provider failure must not corrupt core business state.

Use:

- timeout
- retry
- circuit-breaker strategy where appropriate
- queue retry
- provider response logging
- compensating action
- dead-letter handling

## 12. Architectural Rule

PostgreSQL is the source of truth.

Redis is not the source of truth for financial state or parcel state.

Queues are not the source of truth.

Frontend state must never override backend business rules.
