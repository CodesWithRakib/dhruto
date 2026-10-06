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

## 11. Delivery Pricing (Phase 1)

Delivery fees are centralized in `apps/api/src/pricing/pricing.rules.ts`. No
controller, service or frontend component may compute a fee; the client asks
`POST /pricing/calculate` and only renders the result.

Money rule: every rate is stored in **paisa** (minor units, 1 BDT = 100 paisa)
and all arithmetic is integer-only. Values are converted to BDT at the API edge
(`PAISA_PER_BDT = 100`). `PRICING_RULES_VERSION` is logged with every quote so a
fee can always be traced back to the rule set that produced it.

Zones and rates (`PRICING_RULES_VERSION = "2026.1"`):

| Zone            | Base fee | Extra kg | COD fee      | ETA         |
| --------------- | -------- | -------- | ------------ | ----------- |
| `INSIDE_DHAKA`  | ৳60      | ৳20      | 0 bps        | 24-48 Hours |
| `DHAKA_SUBURBS` | ৳100     | ৳20      | 100 bps (1%) | 48 Hours    |
| `OUTSIDE_DHAKA` | ৳130     | ৳25      | 100 bps (1%) | 72-96 Hours |

The base fee covers the first 1.00 kg (`INCLUDED_WEIGHT_CENTIS`); each further
kilogram is rounded up and charged at the extra-kg rate. Zone classification:

- Thanas Savar, Dhamrai, Keraniganj, Nawabganj and Dohar in Dhaka district are
  `DHAKA_SUBURBS`, not `INSIDE_DHAKA` (`DHAKA_SUBURB_THANAS`).
- Gazipur and Narayanganj districts are `DHAKA_SUBURBS` (`DHAKA_SUBURB_DISTRICTS`).
- Everything else is `OUTSIDE_DHAKA`.

`PricingResult.additionalCharge` and `.discount` are explicit extension points
for later phases (remote-area fee, promotions) and are `0` in Phase 1.

## 12. Financial Tests

Mandatory:

- concurrent credits
- concurrent withdrawals
- duplicate payout request
- insufficient balance
- cash mismatch
- rollback after failed side effect
- retry after provider timeout
- idempotent replay
