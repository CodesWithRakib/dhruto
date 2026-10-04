# Dhruto — Testing Strategy

## 1. Testing Pyramid

```text
             E2E
          Integration
       API / Contract
       Unit / Domain
```

## 2. Unit Tests

Test:

- pricing calculations
- state transitions
- permission rules
- address normalization
- risk scoring
- financial calculations
- validation
- utility functions

## 3. Integration Tests

Test:

- PostgreSQL repositories
- transaction behavior
- Redis cache
- queue publishing
- webhook delivery
- external-provider adapters

## 4. API Tests

Test every critical endpoint for:

- success
- validation failure
- authentication
- authorization
- not found
- business rule failure
- idempotent replay
- duplicate requests

## 5. E2E Scenarios

### Merchant

```text
Login
→ Create Order
→ Print Label
→ Track
→ View Settlement
```

### Bulk Import

```text
Upload
→ Validate
→ Fix errors
→ Confirm
→ Create
```

### Hub

```text
Receive
→ Scan
→ Bag
→ Seal
→ Dispatch
→ Destination Receive
```

### Rider

```text
Assignment
→ Out for Delivery
→ OTP
→ COD
→ Proof
→ Delivered
```

### Finance

```text
Delivered
→ Cash Pending
→ Hub Verification
→ Merchant Credit
→ Payout
```

## 6. State Machine Tests

For every transition:

- valid transition
- invalid transition
- unauthorized transition
- missing prerequisite
- duplicate transition
- concurrent transition

## 7. Financial Concurrency Tests

Simulate concurrent operations against the same wallet.

Expected:

- no lost update
- no negative balance unless explicitly permitted
- no duplicate payout
- correct final ledger
- transaction rollback on failure

## 8. Load Testing

Tool can be `autocannon`, k6, or another approved tool.

Scenarios:

- public tracking
- parcel creation
- status transition
- barcode scan endpoint
- merchant dashboard
- bulk ingestion
- wallet operation

Metrics:

- RPS
- p50
- p95
- p99
- error rate
- CPU
- memory
- DB latency
- Redis latency
- queue latency

## 9. Acceptance Targets

Initial target:

```text
250 RPS
p95 < 300ms
error rate < 1%
```

These are workload-specific targets and must be measured against documented hardware/infrastructure.

## 10. Regression

Every production bug should produce a regression test when practical.

## 11. CI

CI should run:

```text
lint
typecheck
unit tests
integration tests
build
security checks
```

E2E/load tests can run in dedicated pipelines/environments where required.
