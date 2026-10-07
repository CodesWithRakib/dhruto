# Risk Scoring (`rule-risk-v1`)

Transparent logistics-only scoring. **Never** uses religion, ethnicity, race,
politics, orientation, health or any sensitive personal characteristic.

## Signals (all from live tables)

Parcel outcomes + COD (parcels), failed handoffs (delivery_attempts),
verified-vs-expected cash (cash_ledgers), address confidence, order velocity.
Features are aggregated **as-of a cutoff** (`createdAt <= asOf`) per scope:

- `PLATFORM` (`merchantId` NULL) — network-wide recipient history.
- `MERCHANT` — same phone with one merchant (kept separate; concentrated
  returns add `MERCHANT_SPECIFIC_RISK`).

## Cold start

Zero history → `level UNKNOWN`, `riskConfidence LOW`, reason
`INSUFFICIENT_HISTORY`. Lack of history is not evidence of risk.

## Score 0–100 (heuristic, not probability)

Base 20; RTO history up to +45; recent failures +15; COD failure +15; low
completion +10; velocity +10; merchant concentration +5; proven buyers −15.
Thresholds centralized (`riskLow 30`, `riskHigh 70`).

## Reasons (only when data supports them)

`HIGH_RTO_HISTORY`, `MULTIPLE_RECENT_FAILED_DELIVERIES`,
`HIGH_COD_FAILURE_RATE`, `LOW_DELIVERY_COMPLETION_RATE`,
`HIGH_RECENT_ORDER_VELOCITY`, `MERCHANT_SPECIFIC_RISK`, `INSUFFICIENT_HISTORY`.

## Reproducibility

Every evaluation persists `recipient_risk_snapshots` with the full feature
snapshot, `scoringVersion` and `scoredAt`. History is append-only; scores are
never recomputed in place. Rolling latest features live in
`recipient_feature_aggregates` (phone-HMAC keyed).

## Privacy

Phone identity is HMAC-SHA256 with a server pepper (`hashPhone`); raw numbers
never enter intelligence rows or logs. UI shows masked `****1234` at most.
