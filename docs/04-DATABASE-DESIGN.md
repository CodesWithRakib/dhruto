# Dhruto — Database Design

## 1. Database

PostgreSQL.

Use UUID primary keys for internal entities.

Use `TIMESTAMPTZ` for timestamps.

Use database constraints in addition to application validation.

## 2. Core Entities

### users

- id
- name
- email
- phone
- password_hash
- status
- created_at
- updated_at

### roles

- id
- code
- name

### permissions

- id
- code
- name

### user_roles

- user_id
- role_id

### role_permissions

- role_id
- permission_id

### merchants

- id
- user_id
- business_name
- contact_phone
- status
- pickup_address
- created_at
- updated_at

### hubs

- id
- code
- name
- district_id
- thana_id
- address
- status

### riders

- id
- user_id
- hub_id
- status
- joined_at

### parcels

Implemented columns (`apps/api/src/database/entities/Parcel.entity.ts`):

- id
- tracking_code UNIQUE
- merchant_id
- current_rider_id (nullable)
- current_hub_id (nullable)
- recipient_name
- recipient_phone
- parcel_description (nullable)
- raw_address
- district (nullable)
- thana (nullable)
- normalized_address JSONB (nullable; Phase 6 address intelligence only)
- weight
- cod_amount
- delivery_fee
- delivery_otp (nullable)
- status
- created_at
- updated_at

Indexes: `(merchant_id, status)`, `(merchant_id, created_at)`, `(merchant_id, district)`,
`(current_hub_id, status)`, `(current_rider_id, status)`, `(recipient_phone)`, `(status)`, `(created_at)`.

### parcel_status_histories

Append-only audit trail. Rows are never updated or deleted; the parcel's `status`
column is the current state, this table records how it got there.

- id
- parcel_id
- from_status (nullable)
- to_status
- event_type (e.g. `PARCEL_CREATED`, `STATUS_CHANGED`)
- actor_id (nullable)
- actor_role
- description (nullable)
- metadata JSONB (nullable)
- created_at

Indexes: `(parcel_id, created_at)`, `(to_status)`.

### idempotency_records

Backs critical commands (`POST /parcels`). The unique `(key, scope)` index is the
concurrency guard: a claim row is inserted inside the same transaction that
performs the command, then completed with the serialized response before commit.

- id
- key
- scope (default `DEFAULT`)
- user_id (nullable)
- request_hash (SHA-256 of the canonical payload; detects key reuse)
- status_code (nullable while in flight)
- response JSONB (nullable; replayed on duplicate requests)
- completed_at (nullable)
- expires_at (nullable)
- created_at

Unique index: `(key, scope)`.

### parcel_assignments

- id
- parcel_id
- rider_id
- assigned_by
- assigned_at
- unassigned_at

### bags

- id
- bag_code UNIQUE
- origin_hub_id
- destination_hub_id
- status
- sealed_at
- dispatched_at
- received_at

### bag_parcels

- bag_id
- parcel_id

### manifests

- id
- manifest_code UNIQUE
- hub_id
- bag_id
- status
- created_at

### cash_ledgers

- id
- parcel_id UNIQUE
- rider_id
- hub_id
- expected_amount
- collected_amount
- handed_in_amount
- verified_amount
- difference_amount
- status
- created_at
- verified_at

### wallets

- id
- merchant_id UNIQUE
- available_balance
- pending_balance
- created_at
- updated_at

### wallet_transactions

- id
- wallet_id
- type
- amount
- reference_type
- reference_id
- idempotency_key UNIQUE
- created_at

### payout_requests

- id
- merchant_id
- amount
- provider
- destination
- status
- idempotency_key UNIQUE
- created_at

### pricing_rules

- id
- name
- version
- effective_from
- effective_to
- status

### pricing_rule_items

- pricing_rule_id
- weight_from
- weight_to
- zone
- base_fee
- cod_fee_type
- cod_fee_value
- return_fee
- remote_fee

### addresses

Maintain normalized Bangladesh administrative data.

Recommended hierarchy:

```text
divisions
districts
upazilas
areas
hubs
```

### notifications

- id
- user_id
- type
- channel
- payload
- status
- sent_at

### webhooks

- id
- merchant_id
- event
- endpoint
- secret
- status

### webhook_deliveries

- id
- webhook_id
- event_id
- response_code
- attempts
- status
- last_attempt_at

### audit_logs

- id
- actor_id
- action
- resource_type
- resource_id
- before JSONB
- after JSONB
- request_id
- ip
- user_agent
- created_at

## 3. Constraints

- tracking_code unique
- wallet belongs to one merchant
- one cash ledger per parcel
- idempotency keys unique within the appropriate command scope
- amounts use fixed-precision numeric
- foreign keys must be explicit
- status values must be constrained

## 4. Money Rules

Never use floating-point numbers for financial amounts.

Use:

```text
NUMERIC(12,2)
```

or integer minor units if the project standardizes on that approach.

## 5. Indexing

At minimum index:

- parcels.tracking_code
- parcels.merchant_id
- parcels.recipient_phone
- parcels.status
- parcels.created_at
- parcel_status_histories.parcel_id
- cash_ledgers.rider_id
- wallet_transactions.wallet_id
- audit_logs.resource_type/resource_id
- all major foreign keys

Indexes should be validated against real query plans.

## 6. Soft Delete

Do not use soft delete automatically for every table.

For business-critical records, prefer status/inactive flags and immutable history.

Financial and audit records must not be physically deleted through normal application flows.
