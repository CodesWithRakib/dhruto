# Dhruto — Backend Architecture

## 1. Stack

Recommended:

- NestJS
- TypeScript
- PostgreSQL
- TypeORM or another explicit ORM/data layer
- Redis
- BullMQ
- WebSocket
- Swagger/OpenAPI

## 2. Module Structure

```text
src/
├── auth/
├── users/
├── merchants/
├── riders/
├── hubs/
├── parcels/
├── pickups/
├── bags/
├── manifests/
├── tracking/
├── pricing/
├── wallets/
├── cash/
├── settlements/
├── payouts/
├── notifications/
├── webhooks/
├── analytics/
├── audit/
├── common/
└── config/
```

## 3. Layering

Preferred flow:

```text
Controller
  ↓
Application Service
  ↓
Domain/Business Rules
  ↓
Repository/Data Access
  ↓
PostgreSQL
```

Controllers should remain thin.

Business rules must not be embedded in controllers.

## 4. DTOs

Every endpoint must define:

- request DTO
- response DTO
- validation
- authorization requirements

Avoid returning raw entities directly.

## 5. State Machine

Create a dedicated parcel state transition service.

Example:

```text
transitionParcel(parcelId, targetState, actor)
```

Responsibilities:

1. Load parcel.
2. Lock when required.
3. Validate current state.
4. Validate actor permission.
5. Validate business conditions.
6. Update state.
7. Create history event.
8. Execute required side effects.
9. Publish events.
10. Commit.

## 6. Financial Service

Financial service must own:

- wallet transactions
- COD settlement
- cash verification
- payout creation
- balance projections

Financial mutations must be transactional.

## 7. Idempotency Service

Store:

- key
- command type
- actor
- request hash
- response/status
- created_at
- expiry if applicable

Reject same key with a different request payload.

## 8. Queue Services

Workers should be isolated from HTTP request lifecycle.

Example:

```text
Order Created
→ event
→ notification job
→ webhook job
```

## 9. Webhooks

Webhook delivery:

```text
PENDING
→ PROCESSING
→ DELIVERED
```

Failure:

```text
FAILED
→ RETRY
→ DEAD_LETTER
```

Sign payloads with merchant-specific secrets.

## 10. Tracking Service

Public tracking service:

1. Normalize tracking code.
2. Check Redis.
3. On miss query PostgreSQL.
4. Build public-safe response.
5. Cache for 60 seconds.
6. Return.

Invalidate/update cache after relevant status changes.

## 11. Security Architecture

- global validation pipe
- auth guard
- permission guard
- rate limiting
- secure headers
- request ID middleware
- structured logging
- secret management
- audit interceptor/service where appropriate

## 12. Error Architecture

Use typed application errors.

Example:

```text
InvalidStatusTransitionError
InsufficientBalanceError
CashMismatchError
IdempotencyConflictError
ForbiddenActionError
```

Map them consistently to API error codes.

## 13. Database Transactions

Do not open large transactions around slow external calls.

Correct pattern:

```text
DB transaction
→ persist business state
→ commit
→ publish/reliably enqueue async work
```

Where strict atomic event delivery is required, use an outbox pattern.

## 14. Outbox Pattern

For important domain events:

```text
business transaction
+
outbox_events insert
```

Worker publishes/processes the event after commit.

This prevents:

```text
DB committed
but event lost
```

## 15. Testing

Backend must have:

- unit tests
- integration tests
- API tests
- state machine tests
- permission tests
- financial transaction tests
- concurrency tests
- idempotency tests
- queue tests
- E2E tests
- load tests
