# Test-case Template

| Field | Value |
|---|---|
| Test ID | `TC-<module>-<nnn>` (stable) |
| Feature + route | Fxx + `/:locale/...` |
| Level | unit / integration / frontend / e2e / security |
| Preconditions + data | seed refs (`merchant@dhruto.com`, `HUB-DHK-01`, `DHR-…`) |
| Actor + perms | role + hub assignment |
| Steps | numbered |
| Expected | observable state/API/DB |
| Negative/edge | variants |
| Automation | existing file or NEW (vitest/playwright) |
| Status | existing-verified / existing-unverified / missing / blocked |
