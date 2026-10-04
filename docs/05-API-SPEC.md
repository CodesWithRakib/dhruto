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
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
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
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

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
POST /hubs/:hubId/scans
POST /bags
POST /bags/:id/parcels
POST /bags/:id/seal
POST /bags/:id/dispatch
POST /bags/:id/receive
```

### Rider

```text
GET  /riders/me/tasks
POST /riders/me/deliveries/:parcelId/verify-otp
POST /riders/me/deliveries/:parcelId/complete
POST /riders/me/deliveries/:parcelId/fail
POST /riders/me/cash/hand-in
```

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

Response:

```json
{
  "items": [],
  "pagination": {
    "nextCursor": "opaque",
    "hasNextPage": true
  }
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
