# Dhruto — Financial Design

## 1. Principle

Financial correctness is more important than convenience.

Use immutable transaction records and database transactions.

## 2. Merchant Wallet

Conceptual balances:

```text
Available Balance
Pending Balance
Withdrawable Balance
```

A balance may be a projection, but transaction history remains authoritative.

## 3. COD Flow

```text
Order COD = ৳1000
      ↓
Delivery completed
      ↓
Rider expected cash = ৳1000
      ↓
Rider hands in cash
      ↓
Hub verifies
      ↓
Verified = ৳1000
      ↓
Delivery fee = ৳80
      ↓
Merchant settlement = ৳920
```

## 4. Short Cash

Example:

```text
Expected = 1000
Collected = 900
Difference = -100
```

Status:

```text
CASH_MISMATCH
```

Do not automatically erase the discrepancy.

A dispute/reconciliation process must resolve it.

## 5. Double-Entry Concept

Every material money movement should have a source and destination.

Example:

```text
COD Receivable        +1000
Merchant Settlement    -80 fee
Merchant Payable      +920
```

The exact accounting chart can evolve, but transaction direction must always be explicit.

## 6. Wallet Transaction Types

Examples:

```text
COD_CREDIT
DELIVERY_FEE
RETURN_FEE
EXCHANGE_FEE
ADJUSTMENT_CREDIT
ADJUSTMENT_DEBIT
PAYOUT_DEBIT
REFUND
```

## 7. Payout Lifecycle

```text
REQUESTED
→ APPROVED
→ PROCESSING
→ SUCCESS
```

Failure:

```text
FAILED
```

Retry must be idempotent.

## 8. Payout Rules

- Minimum withdrawal amount may apply.
- Merchant must have sufficient withdrawable balance.
- Destination must be verified.
- Duplicate payout commands must not create duplicate transfers.
- Provider response must be stored.
- Manual admin intervention must be audited.

## 9. Locking

For balance-changing operations:

```text
BEGIN
SELECT wallet FOR UPDATE
validate balance
insert wallet transaction
update projection
COMMIT
```

## 10. Corrections

Never mutate historical financial records.

Use compensating transactions.

## 11. Financial Tests

Mandatory:

- concurrent credits
- concurrent withdrawals
- duplicate payout request
- insufficient balance
- cash mismatch
- rollback after failed side effect
- retry after provider timeout
- idempotent replay
