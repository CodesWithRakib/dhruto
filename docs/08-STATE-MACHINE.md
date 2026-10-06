# Dhruto — Parcel State Machine

## 1. States

```text
CREATED
PICKUP_REQUESTED
PICKUP_ASSIGNED
PICKED_UP
ORIGIN_HUB_RECEIVED
BAGGED
IN_TRANSIT
DESTINATION_HUB_RECEIVED
ASSIGNED_TO_RIDER
OUT_FOR_DELIVERY
DELIVERY_ATTEMPTED
RESCHEDULED
DELIVERED
CASH_PENDING
CASH_VERIFIED
RTO_INITIATED
RETURN_IN_TRANSIT
RETURNED_TO_MERCHANT
CANCELLED
LOST
DAMAGED
```

## 2. Transition Rules

| From                     | Allowed To                                   |
| ------------------------ | -------------------------------------------- |
| CREATED                  | PICKUP_REQUESTED, CANCELLED                  |
| PICKUP_REQUESTED         | PICKUP_ASSIGNED, CANCELLED                   |
| PICKUP_ASSIGNED          | PICKED_UP, CANCELLED                         |
| PICKED_UP                | ORIGIN_HUB_RECEIVED                          |
| ORIGIN_HUB_RECEIVED      | BAGGED                                       |
| BAGGED                   | IN_TRANSIT                                   |
| IN_TRANSIT               | DESTINATION_HUB_RECEIVED, LOST, DAMAGED      |
| DESTINATION_HUB_RECEIVED | ASSIGNED_TO_RIDER                            |
| ASSIGNED_TO_RIDER        | OUT_FOR_DELIVERY                             |
| OUT_FOR_DELIVERY         | DELIVERED, DELIVERY_ATTEMPTED                |
| DELIVERY_ATTEMPTED       | RESCHEDULED, OUT_FOR_DELIVERY, RTO_INITIATED |
| RESCHEDULED              | OUT_FOR_DELIVERY                             |
| DELIVERED                | CASH_PENDING                                 |
| CASH_PENDING             | CASH_VERIFIED                                |
| RTO_INITIATED            | RETURN_IN_TRANSIT                            |
| RETURN_IN_TRANSIT        | RETURNED_TO_MERCHANT                         |

The exact production matrix may add operational exception transitions, but every exception must be explicit.

### Implemented exception transitions

Named and covered by unit tests — see
`apps/api/src/parcels/lifecycle/parcel-lifecycle.service.ts`
(`PARCEL_TRANSITIONS` / `canTransition`) and its spec:

| Constant                           | From                          | To                  | Why                                                                                                                                                                                         |
| ---------------------------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRE_PICKUP_RIDER_ASSIGNMENT_FROM` | `CREATED`, `PICKUP_REQUESTED` | `ASSIGNED_TO_RIDER` | Lets a rider be assigned to a parcel before it physically reaches a hub (pre-pickup dispatch), instead of forcing the full `PICKUP_ASSIGNED` -> `PICKED_UP` -> `ORIGIN_HUB_RECEIVED` chain. |

`ORDER_CREATED` from the product specification is implemented as `CREATED`
(`INITIAL_PARCEL_STATUS`); there is no separate `ORDER_CREATED` state.

## 3. Transition Requirements

### Delivery

To move to `DELIVERED`:

- parcel assigned to current rider
- delivery attempt is valid
- customer OTP verified (bcrypt hash, 15 minute TTL, 5-attempt lockout) — always
  required since Phase 3; the secret is never stored, logged, or returned to
  the rider UI
- COD amount recorded and exactly matching the parcel COD if COD exists
- proof recorded as the `DELIVERED` row of the append-only `delivery_attempts`
  log (OTP proof reference, optional photo URL, remarks)

### Reassignment (Phase 3 operational override)

Moving a parcel between riders before delivery starts (`ASSIGNED_TO_RIDER`,
`DELIVERY_ATTEMPTED`, `RESCHEDULED`) keeps or restores `ASSIGNED_TO_RIDER` and
is audited as a `RIDER_REASSIGNED` history event with the previous rider id —
it is an ownership change, not a forward lifecycle transition, so the matrix
above does not govern it. Once `OUT_FOR_DELIVERY` (or terminal) the task is
locked to its rider.

### Cash Verification

To move to `CASH_VERIFIED`:

- rider cash ledger exists
- hub verifies amount
- discrepancy is recorded when amounts differ
- reconciliation actor is authorized

## 4. State History

Every transition creates:

```text
parcel_status_histories
```

Never overwrite history.

## 5. Side Effects

Examples:

```text
DELIVERED
→ create/activate COD cash ledger
→ publish parcel.delivered event
→ queue customer notification
→ queue merchant webhook

CASH_VERIFIED
→ create merchant settlement transaction
→ update pending/available balance according to settlement rules
→ queue merchant notification
```

## 6. Forbidden Behavior

- Direct database status updates bypassing transition service.
- Arbitrary state jumps from frontend.
- Silent status correction.
- Deleting status history.
- Financial mutation without ledger record.

## 7. Testing Matrix

Every allowed transition needs:

- happy path
- unauthorized actor test
- invalid current-state test
- missing prerequisite test
- duplicate command test
- concurrent command test where relevant
