# Dhruto — Master Business Requirements Document (BRD)

## 1. Product Vision

Dhruto is an enterprise-grade, tech-first logistics operating system for Bangladesh's e-commerce and retail supply chain.

The platform connects merchants, hubs, riders, and end customers through a unified parcel, tracking, COD settlement, pricing, notification, and operational workflow.

### Core Business Objectives

1. Reduce COD settlement delays through auditable digital ledgers.
2. Reduce Return-to-Origin (RTO) through risk scoring and operational controls.
3. Normalize Bangladesh addresses into districts, thanas/upazilas, areas, and hubs.
4. Give merchants reliable shipment creation, tracking, reporting, and payouts.
5. Give hubs fast scanning, bagging, dispatch, receiving, and reconciliation workflows.
6. Give riders a mobile-first delivery workflow with OTP, COD, proof, and failed-attempt handling.
7. Provide customers with public, privacy-safe real-time tracking.
8. Build an API-first foundation for future merchant integrations and mobile apps.

## 2. Stakeholders and Roles

| Role | Primary Responsibilities | Interface |
|---|---|---|
| Super Admin | Platform configuration, pricing, finance, users, audit, analytics | `apps/web-admin` |
| Hub Manager | Hub operations, scans, bags, manifests, rider assignment, cash reconciliation | `apps/web-admin` |
| Delivery Rider | Pickup, delivery, OTP, COD, proof, failed attempts | Rider PWA |
| Merchant | Orders, bulk import, labels, tracking, wallet, payouts, reports | `apps/web-merchant` |
| End Customer | Public tracking and delivery actions where permitted | `apps/tracker` |

## 3. Product Surfaces

- Admin/Hub Portal
- Merchant Portal
- Rider PWA
- Public Tracking Portal
- Backend API
- Background Worker/Queue System
- Future mobile applications
- Future merchant public API

## 4. Core Modules

- Authentication and authorization
- Merchant management
- Rider management
- Hub management
- Parcel/order management
- Pickup management
- Barcode scanning
- Bagging and manifests
- Delivery management
- COD collection and reconciliation
- Merchant wallets
- Settlements and payouts
- Pricing/rate engine
- Address intelligence
- Tracking
- Notifications
- Webhooks
- Analytics
- Audit logs
- System configuration

## 5. Parcel Lifecycle

```text
CREATED
  ↓
PICKUP_REQUESTED
  ↓
PICKUP_ASSIGNED
  ↓
PICKED_UP
  ↓
ORIGIN_HUB_RECEIVED
  ↓
BAGGED
  ↓
IN_TRANSIT
  ↓
DESTINATION_HUB_RECEIVED
  ↓
ASSIGNED_TO_RIDER
  ↓
OUT_FOR_DELIVERY
  ├──→ DELIVERED
  │      ↓
  │   CASH_PENDING
  │      ↓
  │   CASH_VERIFIED
  │
  └──→ DELIVERY_ATTEMPTED
           ├──→ RESCHEDULED
           ├──→ OUT_FOR_DELIVERY
           └──→ RTO_INITIATED
                    ↓
              RETURN_IN_TRANSIT
                    ↓
              RETURNED_TO_MERCHANT
```

Terminal/exception states:

- `CANCELLED`
- `LOST`
- `DAMAGED`
- `RETURNED_TO_MERCHANT`

Every transition must be validated against an explicit state-transition matrix.

## 6. Functional Requirements

### Merchant

- Create single parcel.
- Calculate price before confirmation.
- Bulk import CSV/XLSX.
- Preview and validate every row before ingestion.
- Show row-level errors.
- Generate 4x6 thermal labels.
- Track parcels.
- View wallet and transactions.
- Request payouts.
- Configure pickup addresses.
- Manage team users where enabled.
- Configure API keys and webhooks where enabled.

### Hub

- Continuous barcode scanning.
- Camera scanning fallback.
- Receive parcels.
- Create/seal/open bags.
- Generate and process manifests.
- Dispatch bags.
- Receive inbound bags.
- Assign parcels to riders.
- Reconcile rider cash.

### Rider

- View assigned pickups/deliveries.
- Scan parcel.
- View recipient and delivery information.
- Call/navigate to customer where permitted.
- Verify delivery OTP.
- Record COD.
- Capture proof of delivery.
- Record failed delivery reason.
- Reschedule where policy permits.
- Submit cash hand-in.

### Customer

- Track using tracking code.
- View lifecycle timeline.
- View safe destination/status information.
- Receive public status updates.
- Reschedule delivery where business rules allow.

## 7. Financial Rules

Dhruto must use immutable financial ledger records rather than relying only on mutable balance columns.

### Merchant Wallet

- Available balance
- Pending/escrow balance
- Withdrawable balance
- Wallet transactions
- Payout requests
- Payout transactions

### Rider Cash

- Expected COD
- Collected COD
- Handed-in COD
- Verified COD
- Short/excess cash
- Settlement status

Example:

```text
COD = ৳1000
Delivery fee = ৳80
Verified cash = ৳1000
Merchant credit = ৳920
```

All balance-affecting operations must run inside database transactions with appropriate row-level locking.

## 8. Pricing Engine

Final delivery fee may contain:

```text
Base Delivery Fee
+ Weight Surcharge
+ Zone/Distance Fee
+ COD Fee
+ Remote Area Fee
+ Return/Exchange Fee
- Merchant Discount
= Final Charge
```

Pricing rules must be versioned and auditable.

## 9. Address Intelligence

Address data should support:

```text
Division
→ District
→ Upazila/Thana
→ Area
→ Hub
```

Parcel address fields should distinguish:

- raw address
- normalized address
- district
- thana/upazila
- area
- assigned hub
- parser confidence

The first implementation may use deterministic rules and dictionaries; AI-assisted parsing can be added later.

## 10. Notifications

Supported channels:

- In-app
- Push
- SMS
- Email
- Merchant webhook

Core events:

- parcel_created
- pickup_assigned
- parcel_picked_up
- hub_received
- parcel_in_transit
- parcel_out_for_delivery
- parcel_delivered
- delivery_failed
- rto_initiated
- rto_completed
- cash_verified
- payout_completed

## 11. Security

Mandatory:

- JWT access/refresh authentication
- RBAC and permission guards
- DTO validation
- Rate limiting
- Secure password hashing
- Refresh-token rotation
- Idempotency for duplicate-sensitive commands
- Webhook signature verification
- Sensitive-data masking
- Audit logging
- Request IDs
- Secure headers
- Least-privilege access

## 12. Audit

Every sensitive mutation must record:

- actor
- role
- action
- resource
- resource ID
- before value where applicable
- after value where applicable
- IP where available
- user agent where available
- request ID
- timestamp

## 13. Non-Functional Requirements

Initial targets:

- Peak ingestion capacity: at least 250 requests/second for defined workloads.
- p50 API latency target: <150ms for normal lightweight APIs.
- p95 target: <300ms for normal lightweight APIs.
- p99 target: <500ms unless an endpoint is explicitly classified as long-running.
- Public tracking should use Redis caching with a target TTL of 60 seconds.
- Background notifications and webhooks must be queue-backed.
- Financial operations must be transaction-safe.
- APIs must be observable and measurable.

## 14. MVP Acceptance Criteria

1. Merchant can create a single parcel.
2. Merchant can bulk import XLSX/CSV with preview and validation.
3. System calculates delivery/COD charges.
4. System generates 4x6 thermal labels with scannable barcodes.
5. Hub can scan and transition parcels through permitted operational states.
6. Hub can bag and dispatch parcels.
7. Rider can receive delivery tasks.
8. Rider can complete OTP/COD delivery.
9. Failed delivery can be recorded with a reason.
10. COD is recorded and reconciled.
11. Merchant wallet receives the correct verified amount after applicable fees.
12. Customer can publicly track a shipment.
13. Every important parcel transition creates a history event.
14. Sensitive financial and status mutations are auditable.
15. Duplicate order/payment commands are protected by idempotency.

## 15. Scope Phases

### Phase 1 — MVP

Auth, RBAC, merchant, parcel, pricing, hub, rider, barcode, delivery, COD, tracking, basic settlement, notifications.

### Phase 2

Bulk import, advanced analytics, address intelligence, RTO scoring, merchant webhooks/API, automated payouts.

### Phase 3

AI address parsing, advanced fraud detection, route optimization, predictive analytics, dynamic pricing, fleet optimization.

## 16. Definition of Done

A feature is not complete when only the UI or API works. A feature is complete only when applicable:

- business rules are implemented
- permission checks exist
- validation exists
- database constraints exist
- transaction boundaries are correct
- idempotency is handled
- audit events are emitted
- API contract is documented
- frontend loading/empty/error/success states exist
- tests pass
- observability exists
- documentation is updated
