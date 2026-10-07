# Geography Data

## Source

Compiled from the BBS administrative hierarchy into
`apps/api/src/intelligence/data/bangladesh-locations.ts`:
**64 districts, 242 upazilas/thanas**, 8 divisions, delivery zones, Bangla
names, aliases (spelling variants, transliterations, historical names) and
sadar postal codes. Version `bd-geo-2026-10`, source string recorded per import.

## Storage

- `geo_dataset_versions` — `{version, source, importedAt, counts, status}`.
  Imports supersede old versions, never delete them.
- `geo_places` — canonical nodes (`DIVISION|DISTRICT|UPAZILA`) with stable
  `code` (`BD-RG-PAN`, `BD-RG-PAN-DEBIGANJ`…), `name/nameBn`, `parentId`,
  denormalized `division`, `zone`, `aliases`, `postalCodes`, `datasetVersion`.
- `address_aliases` — runtime alias additions (`alias, language, aliasType,
  source`), unique on normalized alias; duplicates rejected.

## Import

`GeoDataService.ensureImported()` — code-keyed upserts in one transaction,
idempotent and re-runnable. Admin: `POST /admin/intelligence/geography/import`
(5/5min). Seed runs it automatically. Hot matching uses in-memory normalized
indexes, not per-request table scans.

## Updates

Edit the dataset file → bump `GEO_DATASET_VERSION` → run import (or seed).
Old parse rows keep their `datasetVersion`, so historical results stay
reproducible. Never edit production place codes in place; add a new version.

## Limitations

Upazila depth is representative (3–8 per district), not the full ~495.
Union/ward/municipality/village fields exist in the structured-address
contract but resolve to `null` until dataset depth is added.
