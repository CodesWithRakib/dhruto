# Recommendations, Overrides & Feedback

## Rules (advisory by default)

| Trigger | Action |
|---|---|
| Address needs confirmation | `VERIFY_ADDRESS` |
| Risk or RTO HIGH | `MANUAL_REVIEW` + `CALL_CUSTOMER` |
| Risk HIGH | `SUGGEST_PREPAID` |
| Risk or RTO MEDIUM | `REVIEW_BEFORE_DISPATCH` |

Every recommendation carries structured `reasons`. Persisting one **never**
mutates parcel, finance or delivery state.

## UI language

Operational wording only ("High delivery risk", "Verify address").
Never fraud accusations ("fraud", "scammer", "fake customer") — the score
measures operational risk, not guilt. Risk internals are hidden from customer
tracking pages (parcel intelligence APIs are merchant/admin/hub scoped).

## Overrides (audited)

`POST /intelligence/recommendations/:id/override` with `{decision:
PROCEED|HOLD, reason}` records `overriddenBy/At/Reason/Decision` on the row
and logs `RECOMMENDATION_OVERRIDDEN`. Accept/dismiss endpoints capture lighter
feedback. Admin reviews overrides at `GET /admin/intelligence/overrides`.

## Feedback loop

`POST /intelligence/feedback` stores `{subjectType, subjectId, signal, actor,
detail}` deduplicated per actor+signal. Signals: `ADDRESS_ACCEPTED/REJECTED/
CORRECTED`, `RISK_CORRECT/INCORRECT`, `RTO_CORRECT/INCORRECT`,
`RECOMMENDATION_ACCEPTED/IGNORED`. Stored for future training; **nothing
auto-trains**.
