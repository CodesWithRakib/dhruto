# RTO Prediction (`rule-based-rto-v1`)

## Outcome definition

`P(RTO)` = probability the shipment **ultimately enters the RTO ladder**
(`RTO_INITIATED → RETURN_IN_TRANSIT → RETURNED_TO_MERCHANT`, plus `CANCELLED`)
versus terminal `DELIVERED` (`DELIVERED/CASH_PENDING/CASH_VERIFIED`).
Prediction is created at parcel/intelligence time; the outcome is labeled only
when the parcel actually reaches a terminal state.

## No-leakage rule (mandatory)

Features are computed strictly from rows with `createdAt <= predictedAt`.
`RecipientFeaturesService.build({asOf})` enforces the cutoff on parcels,
attempts and ledgers. Outcome labels are written later into `outcome/outcomeAt`
and **never** backfilled into the frozen feature set.

## Baseline model

`RuleBasedRtoEngine` implements `RtoPredictorEngine`:

```
base 15 + RTO history (35/18) + low completion 15 + COD failure 12
  + velocity 8 + vague address 10 + high COD 8 → clamp 0..100
LOW <30 · MEDIUM <70 · HIGH ≥70 · UNKNOWN on cold start
```

Output is a **heuristic score**, surfaced as "operational score, not a
probability". Never presented as a calibrated `% chance`.

## Versioning + registry

Every prediction stores `modelType/modelVersion/predictedAt/features`.
`scoring_models` tracks `{name, version, type, status, configuration}` with
exactly one ACTIVE row per name. A future `MlBasedRtoEngine` implements the
same interface — API, frontend and tables are unchanged.

## Outcome convergence

Rider delivery completion labels outcomes immediately; hub RTO finalization
converges lazily on the next intelligence read; a backfill pass (see
`backfill.md`) labels the rest. `metrics` exposes prediction/outcome counts
for Phase 7 precision/recall work.
