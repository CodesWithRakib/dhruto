# 03 — End-to-End Business Workflows (Index)

> Each workflow below has a step-by-step doc in `workflows/`. Statuses: Implemented but not verified (code observed, not executed) unless noted. Template: `workflows/_template.md`.

| # | Workflow | Actor → goal | Entry | Doc |
|---|---|---|---|---|
| W1 | Merchant onboarding + login | Visitor → merchant account → dashboard | `/register` → `/login` → `/merchant/dashboard` | `workflows/w1-merchant-onboarding.md` |
| W2 | Parcel creation (single) + pricing + label | Merchant → priced parcel + label | `/merchant/bookings/new` → `/merchant/parcels/:id[/label]` | `workflows/w2-parcel-booking.md` |
| W3 | Parcel list / search / tracking (merchant + admin + public) | Merchant/Admin/Customer → find + track | `/merchant/parcels`, `/admin/parcels`, `/track[/:code]` | `workflows/w3-parcel-tracking.md` |
| W4 | Hub inbound (scan → inventory) | Hub manager → receive + reconcile | `/hub/scanner`, `/hub/parcels`, `/hub/dashboard` | `workflows/w4-hub-inbound.md` |
| W5 | Bagging + manifests (dispatch → receive) | Hub → consolidate → transfer → reconcile | `/hub/bags[/:id]`, `/hub/manifests[/:id]` | `workflows/w5-bag-manifest.md` |
| W6 | Rider assignment + delivery (OTP + COD) + fail/reschedule | Rider → deliver + collect COD | `/admin/rider`, `/rider/tasks[/:id]`, `/rider/history` | `workflows/w6-rider-delivery.md` |
| W7 | COD → hand-in → verify → settlement → payout | Rider/Hub/Admin/Merchant → money to merchant | `/rider/profile`, `/hub/cash`, `/admin/finance`, `/merchant/finance` | `workflows/w7-finance-settlement.md` |
| W8 | Exceptions + returns/RTO | Hub/Admin → resolve + return-to-origin | `/hub/exceptions`, parcel history | `workflows/w8-exceptions-returns.md` |
| W9 | Notifications + webhooks + integrations | Merchant/Admin → notified + integrated | `*/notifications`, `/merchant/developer/webhooks`, `/admin/integrations` | `workflows/w9-notifications-webhooks.md` |
| W10 | Intelligence (address parse/confirm + risk/RTO) | Merchant/Hub/Rider → clean address + risk call | `/merchant/intelligence`, booking `SmartAddressFill`, parcel intelligence panel | `workflows/w10-intelligence.md` |
| W11 | Analytics + reports/exports + alerts | Merchant/Admin → insight + export | `/merchant/analytics`, `/admin/analytics[/:section]`, `/:locale/analytics` | `workflows/w11-analytics.md` |

## Cross-workflow notes
- **Bulk import:** nav `?mode=bulk` exists but `BookingForm` ignores it → W2 covers single only; bulk is Missing (task in `15`). No bulk endpoint observed (`POST /parcels` is single; `xlsx` dep exists in `apps/api/package.json:43` but no bulk route found — Unknown, needs verification).
- **Pickup requests:** no `pickup` route/endpoint/entity found → Missing (see `07`).
- **Merchant profile edit:** `PATCH /merchants/me` exists (backend-only, no UI page) → gap in W1.
- **Returns/RTO:** state machine + `RtoPrediction` exist, but no dedicated returns UI flow → Partial (W8).
- **Pickup assignment / rider availability:** duty toggle exists; no explicit pickup-request assignment → Partial (W6).
