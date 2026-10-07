# Privacy

- Recipient identity in intelligence tables is `HMAC-SHA256(phone, pepper)`;
  pepper from `INTELLIGENCE_PHONE_PEPPER` (dev fallback: JWT secret).
- Raw phone numbers never enter intelligence rows, Redis keys, or logs.
  Use `maskPhone` (`****1234`) for any support display.
- No sensitive personal characteristics are used as signals — logistics
  history only (see `risk-scoring.md`).
- Risk/RTO internals are RBAC-scoped (merchant own parcels, hub operational,
  admin broad, rider delivery-only, customer none).
- Retention: prefer aggregates over raw PII for analytics; see
  `model-versioning.md`.
