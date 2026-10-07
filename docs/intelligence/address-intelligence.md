# Address Intelligence

Deterministic, explainable Bangladesh address parsing. Advisory only — the
parser suggests structure and confidence; it never overwrites `rawAddress` and
never changes parcel routing by itself.

## Pipeline

```
Raw → NFC/Bangla-digit fold → lowercase → punctuation/space fold
  → abbreviation expansion (dist/upz/th/rd/vill/sec/blk)
  → tokenization
  → district exact/alias scan → thana scan → bounded fuzzy (≤2, tokens ≥4)
  → hierarchy validation + conflict detection
  → confidence 0..1 → structured address + candidates
```

Same input + same `parserVersion`/`datasetVersion` → same result. No network,
no randomness, no timestamps in the transform.

## Matching stages

1. **EXACT** — canonical district/thana name substring.
2. **ALIAS** — spelling variants, transliterations, historical names
   (`dacca`, `chittagong`, `borishal`, `jashore`, `comilla`, `bogra`…).
3. **NORMALIZED** — fallback after full normalization.
4. **FUZZY** — bounded Levenshtein on tokens (`dhanmandi→dhanmondi`).
5. **HIERARCHY_INFERRED** — thana implies its district; explicit district wins
   over thana-implied district (conflict flagged, not silently switched).
6. **MANUAL** — human confirmation via candidates.

## Confidence (0.00–1.00, 2dp)

Evidence sum: district exact 0.50 / alias 0.45 / fuzzy 0.25; thana 0.35
(fuzzy 0.28); postal 0.10; house/road/sector detail 0.05; conflict −0.20;
no-district capped at 0.30. Thresholds (centralized
`DEFAULT_CONFIDENCE_THRESHOLDS`): ≥0.95 high, ≥0.75 good, ≥0.50 needs
confirmation, <0.50 low.

## Confirmation workflow

`requiresConfirmation` when confidence < 0.50, conflict, multiple candidates,
or no district. `POST /intelligence/address/confirm` records
`{parseId, candidateIndex|manualStructure, actor, source, timestamp}` in
`address_confirmations`. Originals preserved; parser rows carry
`parserVersion` (`address-parser-v1.0`) + `datasetVersion` (`bd-geo-2026-10`).

## Performance

In-memory alias indexes (no per-request table scans); Redis cache
`address-parser:{parser}:{dataset}:{hash}` TTL 1h; persisted rows keyed by
`normalized_hash`. Fail-safe: cache/DB failures degrade to uncached compute,
never block parcel creation.
