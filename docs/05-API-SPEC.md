# Dhruto — API Specification

## 1. API Rules

Base path:

```text
/api/v1
```

Authentication:

```text
Authorization: Bearer <access-token>
```

Critical commands require:

```text
Idempotency-Key: <unique-key>
```

## 2. Response Contract

Success:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "path": "/api/v1/parcels",
  "requestId": "uuid",
  "timestamp": "ISO-8601",
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [],
  "path": "/api/v1/parcels",
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

`path`, `requestId` and `timestamp` are elevated to the top level of the
envelope by `ResponseTransformInterceptor`; they are not nested under `meta`.
`meta` is reserved for pagination and is omitted entirely when the handler does
not return any. Operational probes (`/health`, `/system`) intentionally bypass
the envelope and return a flat payload.

## 3. Modules

```text
/auth
/users
/merchants
/riders
/hubs
/parcels
/pickups
/bags
/manifests
/tracking
/pricing
/wallets
/cash
/settlements
/payouts
/notifications
/webhooks
/analytics
/audit-logs
```

## 4. Representative Endpoints

### Auth

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Merchant

```text
GET  /merchants/me
PATCH /merchants/me
GET  /merchants/me/dashboard
GET  /merchants/me/orders
```

### Parcels

```text
POST /parcels
POST /parcels/bulk/validate
POST /parcels/bulk/import
GET  /parcels/:id
GET  /parcels
POST /parcels/:id/transition
POST /parcels/:id/assign-rider
```

### Tracking

```text
GET /tracking/:trackingCode
```

This endpoint must return only public-safe data.

### Hub

```text
GET  /hubs
GET  /hubs/destinations
GET  /hubs/:id
GET  /hubs/:id/dashboard
GET  /hubs/:id/inventory
POST /hubs/:id/scans
GET  /hubs/:id/scans
GET  /hubs/:id/parcels/:trackingCode
POST /hubs/:id/bags
GET  /bags?hubId=&status=
GET  /bags/:id
POST /bags/:id/parcels
POST /bags/:id/seal
POST /hubs/:id/manifests
GET  /hubs/:id/manifests
GET  /manifests/:id
POST /manifests/:id/dispatch
POST /manifests/:id/receive
GET  /exceptions?hubId=&status=
POST /exceptions/:id/resolve
```

Bags never dispatch or receive on their own: movement happens on the manifest
(`dispatch` moves every enclosed bag and parcel to `IN_TRANSIT`; `receive`
reconciles scanned bag codes and rejects unexpected bags instead of absorbing
them). Scans accept an `idempotencyKey` so scanner key-repeat and network
retries cannot double-apply an operation.

### Rider

```text
GET  /riders/me/dashboard
GET  /riders/me/tasks?status=
GET  /riders/me/tasks/:parcelId
GET  /riders/me/history?page=&limit=&status=
GET  /riders/me/profile
POST /riders/me/duty
POST /riders/me/parcels/:parcelId/start-delivery
POST /riders/me/deliveries/:parcelId/otp
POST /riders/me/deliveries/:parcelId/verify-otp
POST /riders/me/deliveries/:parcelId/complete            (Idempotency-Key optional)
POST /riders/me/deliveries/:parcelId/fail
POST /riders/me/cash/hand-in
GET  /riders/me/cash/summary
GET  /riders?hubId=                                      (admin/hub manager, hub-scoped)
GET  /riders/:id                                         (admin/hub manager, hub-scoped)
```

Delivery completion requires a verified customer OTP and an exact COD match;
repeats replay the recorded delivery instead of duplicating attempts, cash or
history. The OTP secret is never returned outside non-production automation.

### Finance

```text
GET  /wallets/me
GET  /wallets/me/transactions
POST /payouts
GET  /payouts
POST /admin/cash/:ledgerId/verify
```

## 5. Pagination

List endpoints must support a consistent pagination contract.

Preferred:

```text
cursor
limit
```

For administrative reporting where stable page navigation is required, offset pagination may be used.

Response (cursor shape):

```json
{
  "items": [],
  "pagination": {
    "nextCursor": "opaque",
    "hasNextPage": true
  }
}
```

### Implemented offset pagination (Phase 1, `GET /parcels`)

`GET /parcels` accepts `page`, `limit`, `sort`, `order`, `status`, `search`,
`district`, `thana`, `from` and `to`. The pagination envelope is **flattened
directly onto `meta`** — there is no nested `meta.pagination`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [{ "id": "uuid", "trackingCode": "DHR-YYYYMMDD-XXXXXX" }],
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 148,
    "totalPages": 30,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "path": "/api/v1/parcels?page=1&limit=5",
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

## 6. Filtering

Use explicit query parameters.

Example:

```text
GET /parcels?status=OUT_FOR_DELIVERY&hubId=...&from=...&to=...
```

Never expose arbitrary database column sorting/filtering.

## 7. Idempotency

Required for:

- parcel creation
- bulk ingestion commands
- delivery completion where duplicate effects are possible
- wallet-affecting operations
- payout creation
- cash verification

The backend must return the original result when the same valid idempotency key is replayed.

### Implemented behavior (Phase 1, `POST /parcels`)

`Idempotency-Key` is **required** on `POST /parcels`; a request without it is
rejected with `VALIDATION_ERROR`. A DB unique constraint on
`(key, scope)` is the concurrency guard — not an application-level check.
`IdempotencyService.resolve()` returns one of:

- `replay` — the same key and an equivalent payload were already processed, so
  the original stored result is returned unchanged (safe retry, no duplicate
  parcel).
- `conflict` — the key was reused with a _different_ payload; rejected with
  `IDEMPOTENCY_CONFLICT` (`409`).
- `in_progress` — a request with the same key is still executing; rejected with
  `IDEMPOTENCY_IN_PROGRESS` (`409`) so the caller retries rather than creating a
  second parcel.

A concurrent duplicate is polled briefly (10 attempts x 200 ms) before being
classified, so a double submission normally resolves to a `replay` and returns
the same parcel instead of an error. Side effects such as the append-only
status history row are written only by the winning transaction.

## 8. Error Codes

Examples:

```text
AUTH_INVALID_CREDENTIALS
AUTH_UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
PARCEL_NOT_FOUND
INVALID_STATUS_TRANSITION
DUPLICATE_IDEMPOTENCY_KEY
INSUFFICIENT_BALANCE
CASH_MISMATCH
PAYOUT_NOT_ALLOWED
HUB_MISMATCH
OTP_INVALID
OTP_EXPIRED
RATE_NOT_FOUND
EXTERNAL_PROVIDER_ERROR
```

## 9. API Documentation

OpenAPI/Swagger must be generated from backend decorators and DTOs.

Request/response schemas must be typed.

Do not document endpoints separately in a way that can drift from the implementation.
