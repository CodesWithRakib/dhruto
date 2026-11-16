# Release Blocker 01 — Dependency Audit

Date: 2026-11-16 · Scope: critical and high dependency advisories open at the end of Phase 8 (F-1, F-2 in `PHASE-8-SECURITY-ASSESSMENT.md`), plus any critical/high advisory present in the lockfile today.

## 1. Method

- `pnpm audit --json` (pnpm 12.4.2) at the repository root against `pnpm-lock.yaml`, before and after the change.
- Advisory details (affected ranges, first patched version) re-checked against the GitHub Advisory Database API for every critical/high item.
- Patched releases confirmed on the npm registry (`npm view <pkg> versions/time/dependencies`), including release dates (all chosen versions are ≥ 4 days old; most ≥ 3 weeks).
- Usage of each vulnerable package located in source (`grep`) to judge reachability.

## 2. Next.js minimum patched version — still current?

Yes. GHSA-2464-fhr4-w9xw and GHSA-673q-mjm6-r5xr (critical) and GHSA-p3m5-59mp-jv5r (high) list `next >= 16.0.0, <= 16.4.0` as affected and **16.4.1** as first patched (15.x line: 15.5.28). Latest stable on the 16.4 line at audit time: **16.4.6** (2026-11-09). No advisory affects 16.4.6 (`pnpm audit` after upgrade).

## 3. Findings before remediation (critical + high)

`pnpm audit` totals before: **critical 4 · high 7 · moderate 13 · low 5**.

| Package        | Installed | Advisory            | CVE             | Severity | First patched       | Direct / transitive                 | Dependency path(s)                                                                  | Affected app                             |
| -------------- | --------- | ------------------- | --------------- | -------- | ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| next           | 16.3.8    | GHSA-2464-fhr4-w9xw | —               | Critical | 16.4.1              | Direct                              | `apps/web-merchant > next`; `packages/ui > next`; `web-merchant > next-intl > next` | web-merchant (runtime)                   |
| next           | 16.3.8    | GHSA-673q-mjm6-r5xr | —               | Critical | 16.4.1              | Direct                              | same                                                                                | web-merchant (runtime)                   |
| next           | 16.3.8    | GHSA-p3m5-59mp-jv5r | CVE-2026-94482  | High     | 16.4.1              | Direct                              | same                                                                                | web-merchant (runtime)                   |
| zod            | 3.25.76   | GHSA-mrhx-c7xc-m3w5 | CVE-2023-54404  | High     | **4.6.6 only**      | Direct                              | `apps/api > zod`; `packages/contracts > zod`; `apps/web-merchant > zod`             | API (request validation), web, contracts |
| body-parser    | 2.3.0     | GHSA-27r3-jxmh-p828 | CVE-2026-111181 | High     | 2.4.0               | Transitive                          | `apps/api > @nestjs/core > @nestjs/platform-express > express > body-parser`        | API (runtime)                            |
| multer         | 2.4.0     | GHSA-q7qp-rjg7-q26m | CVE-2026-113872 | High     | 2.5.0               | Transitive (pinned exactly by Nest) | `apps/api > @nestjs/platform-express > multer`                                      | API (runtime)                            |
| xlsx (SheetJS) | 0.18.5    | GHSA-4r6h-8v6p-xvw6 | CVE-2023-30533  | High     | 0.19.3 (not on npm) | Direct                              | `apps/api > xlsx`                                                                   | API (analytics export)                   |
| xlsx (SheetJS) | 0.18.5    | GHSA-5pgg-2g8v-p4x9 | CVE-2024-22363  | High     | 0.20.2 (not on npm) | Direct                              | `apps/api > xlsx`                                                                   | API (analytics export)                   |
| tinypool ¹     | 1.1.1     | GHSA-5gmw-xhrv-c9v3 | CVE-2026-104848 | Critical | 2.1.1               | Transitive (dev)                    | `{api, contracts, web-merchant} > vitest > tinypool`                                | Test tooling only                        |
| tinypool ¹     | 1.1.1     | GHSA-85c8-ppgw-ccpr | CVE-2026-104849 | Critical | 2.1.2               | Transitive (dev)                    | same                                                                                | Test tooling only                        |
| vite ¹         | 7.3.6     | GHSA-587h-7wmj-h5pm | CVE-2026-112942 | High     | 7.3.7               | Transitive (dev)                    | `apps/api > vitest > vite`; `apps/api > unplugin-swc > unplugin > vite`             | Test tooling only                        |

¹ Not listed in Phase 8 (published or first detected after the Phase 8 audit). Included because the objective is "all confirmed critical and high".

### Reachability notes

- **next** — verified in source: no `"use cache"` directive, no `next/image` import, no `"use server"` actions, no `images` block in `next.config.ts`. However, the `/_next/image` optimizer endpoint is served by default by `next start` / standalone output regardless of `next/image` usage, so GHSA-2464 cannot be ruled unreachable from the code alone. Treated as exploitable (critical, internet-facing) — upgrade, do not rely on non-usage.
- **zod** — every API request body validated by a zod contract (chat REST, realtime events, parcel booking) is attacker-controlled. Phase 8 limited impact with a 1 MB body limit and bounded arrays; the advisory remained.
- **body-parser / multer** — every API request goes through Express body parsing; multer is used by Nest's file interceptors.
- **xlsx** — both advisories are in the _parser_ (reading crafted files). The API only _writes_ workbooks (`analytics-export.service.ts`, `XLSX.utils.aoa_to_sheet` → `XLSX.write`); no file is ever read. Low practical reachability, but the package was flagged and had a vendor fix.
- **tinypool / vite** — run only inside `vitest` on developer/CI machines; not in any production bundle or image.

## 4. Moderate / low (not in scope, recorded)

`vitest`/`@vitest/mocker` 3.2.7 (patched only in vitest ≥ 4.1.12, a major), `js-yaml` 5.3.0 (via `@nestjs/swagger`), `fast-uri` 3.1.8 (via `@nestjs/schematics`, dev), `postcss-selector-parser` 6.1.4 (via tailwindcss, build), `glob`/`minimatch` (dev/build tooling, patched only in majors), `esbuild` 0.27.7 (via tsup, dev), `deepmerge` 4.3.1 (via `@nestjs/cli`, dev, no fix). See `RELEASE-BLOCKER-01-REMEDIATION.md` §5.
