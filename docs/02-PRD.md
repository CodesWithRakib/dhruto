# Dhruto — Product Requirements Document (PRD)

## 1. Product Principles

- Operations-first
- Financial correctness over convenience
- API-first
- Mobile-first for riders
- Privacy-safe tracking
- Auditable state changes
- Idempotent critical commands
- Explicit permissions
- Measurable performance

## 2. User Journeys

### Merchant — Single Order

1. Login.
2. Open Create Order.
3. Enter recipient and address.
4. System resolves location and pricing.
5. Merchant confirms.
6. System creates parcel and tracking code.
7. Merchant prints label.
8. Pickup workflow begins.
9. Merchant tracks lifecycle.
10. After verified COD reconciliation, merchant balance is credited.

### Merchant — Bulk Order

1. Download template.
2. Upload CSV/XLSX.
3. Parse file.
4. Validate schema.
5. Validate every row.
6. Show valid/invalid counts.
7. Merchant fixes errors or confirms valid rows.
8. Backend creates orders idempotently.
9. Generate labels.

### Hub

1. Scan inbound parcel/bag.
2. Validate expected hub.
3. Record event.
4. Place parcel in bag.
5. Seal bag.
6. Generate manifest.
7. Dispatch.
8. Destination hub scans receipt.

### Rider

1. Login.
2. View assigned route/tasks.
3. Open parcel.
4. Verify recipient.
5. Enter delivery OTP.
6. Record COD.
7. Capture proof if required.
8. Mark delivered.
9. COD enters rider cash ledger.
10. Rider hands in cash.
11. Hub verifies.

### Customer

1. Enter tracking code.
2. Backend returns safe tracking data.
3. UI displays current status and timeline.
4. Optional supported delivery action is shown.

## 3. Core Screens

### Merchant

- Login
- Dashboard
- Orders
- Create Order
- Bulk Import
- Order Details
- Tracking
- Labels
- Wallet
- Transactions
- Payouts
- Reports
- Webhooks
- API Keys
- Settings

### Admin/Hub

- Dashboard
- Parcels
- Scanner
- Bags
- Manifests
- Hubs
- Riders
- Rider Assignment
- Cash Reconciliation
- Merchants
- Finance
- Pricing
- Analytics
- Audit Logs
- Settings

### Rider

- Login
- Dashboard
- Pickup Tasks
- Delivery Tasks
- Parcel Details
- Delivery Confirmation
- Failed Delivery
- Cash
- Hand-in
- Profile

### Tracker

- Tracking Search
- Shipment Summary
- Timeline
- Delivery Information
- Supported Reschedule Action

## 4. UX Requirements

Every data-heavy screen must define:

- loading
- empty
- error
- success
- pagination
- filtering
- sorting
- confirmation
- permission-denied
- retry

Use consistent table, modal, toast, form, and status components.

## 5. Accessibility

- Keyboard navigation
- Semantic HTML
- Focus management
- Accessible form labels
- Color-independent status indication
- Adequate touch targets for rider UI
- Screen-reader-friendly controls

## 6. Responsive Strategy

Merchant/admin portals are desktop-first but responsive.

Rider UI is mobile-first.

Public tracking must work on low-end mobile devices and slow networks.

## 7. Business Rules

- A parcel cannot skip unauthorized states.
- Only permitted roles may mutate operational states.
- Delivered parcels cannot be silently edited back to an earlier state.
- Financial records are immutable; corrections use compensating transactions.
- Duplicate create/payment commands must be rejected or safely replayed using idempotency keys.
- Customer-facing tracking must never expose internal sensitive information.

## 8. Analytics

MVP metrics:

- orders created
- pickup success
- delivery success
- RTO rate
- average delivery duration
- COD collected
- COD outstanding
- merchant payout amount
- rider performance
- hub throughput

## 9. Product KPIs

- Delivery success rate
- RTO rate
- Average delivery time
- COD reconciliation time
- Settlement accuracy
- Merchant retention
- API success rate
- Tracking latency
- Hub processing time
