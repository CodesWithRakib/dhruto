# API Catalog — Conventions

Global prefix `/api/v1` (health `health|system` unprefixed). Envelope `{success,statusCode,message,data,meta{requestId,timestamp}}`. Validation → 422 `{VALIDATION_ERROR, errors[]}`. Auth: `@Public` or `JwtAuthGuard+RolesGuard(+RateLimitGuard)`. `ADMIN` bypasses `RolesGuard`. Hub routes add `assertHubAccess(perm)`. Money writes use `Idempotency-Key` where noted. Per-module files below list `METHOD path → handler → DTO → roles → rate-limit → consumer → tests → status/gaps`.
