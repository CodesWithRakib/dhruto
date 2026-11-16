# Communication Platform — Phase 8 API Compatibility

Changes under review (introduced in Phase 7): (1) `POST /chat/admin/reports/:id/review` requires `resolutionNote` for `RESOLVED`/`DISMISSED`; (2) `GET /chat/attachments/:id/download` returns **409** `CHAT_ATTACHMENT_SCAN_PENDING` / `CHAT_ATTACHMENT_BLOCKED` to authorized participants until a CLEAN verdict; (3) attachment items carry `scanStatus`. Phase 8 changes no public API contract.

## 1. Consumers found

All consumers are in this repository. A search for the affected paths and fields across `apps/`, `packages/` and `scripts/` found no other client. No webhook or external integration emits or consumes chat attachment downloads or report reviews (chat events have empty webhook fan-out, ADR-020).

## 2. Compatibility matrix

| Consumer                                  | Report review note                                               | Download 409 (pending/blocked)                                                              | `scanStatus` field               | Socket payloads                          | Status                                        |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- | --------------------------------------------- |
| Shared contracts (`@dhruto/contracts`)    | `reviewChatReportSchema` refine (note required)                  | Error codes exported                                                                        | Required in `ChatAttachmentItem` | Same mapper as REST (`toAttachmentItem`) | Consistent                                    |
| Admin web — Communication Center          | Note dialog for resolve/dismiss; 422 mapped to a localized error | Staff use grant-gated restricted download                                                   | Scan badges, queue filter        | n/a (polling)                            | Handled (Phase 7 E2E, Phase 8 cross-browser)  |
| Admin web — messenger (`/admin/messages`) | n/a                                                              | `AttachmentSecurityGate`: "security check in progress" (polls) / "blocked"                  | Drives the gate                  | `message:new` items include `scanStatus` | Handled                                       |
| Merchant web — messenger                  | n/a                                                              | Same shared component                                                                       | Same                             | Same                                     | Handled (Phase 6 E2E ×3 browsers)             |
| Rider web — messenger                     | n/a                                                              | Same shared component                                                                       | Same                             | Same                                     | Handled (rider journey in Phase 6 E2E)        |
| Hub manager web — messenger               | n/a                                                              | Same shared component (`MessengerLayout section="hub"`)                                     | Same                             | Same                                     | Handled by shared code; no hub-specific E2E   |
| Customer web — messenger                  | n/a                                                              | Same shared component                                                                       | Same                             | Same                                     | Handled (Phase 7 E2E customer journeys)       |
| RTK Query `chat.api.ts`                   | n/a                                                              | `getAttachmentDownload` errors surface as typed errors (`chatErrorKey` maps both codes)     | n/a                              | n/a                                      | Handled                                       |
| RTK Query `chat-admin.api.ts`             | `reviewReport` sends the note                                    | `restrictedDownload` never cached                                                           | n/a                              | n/a                                      | Handled                                       |
| Older clients (pre-Phase-7 bundle)        | Would get 422 without a note                                     | Get a 409 JSON error, **never a URL** → shown as a generic error, not a successful download | Unknown field ignored            | Unknown field ignored                    | Safe (fails closed); UX degraded until reload |

## 3. Why no compatibility shim

A shim that returned the old behavior (download URL before scanning, or note-less resolution) would re-open exactly the risks Phase 7 closed. The web app is served by the same release, so a browser reload picks up the new bundle; there are no mobile or third-party clients. Recommended rollout: deploy API and web together (release checklist), then the old bundle in open tabs degrades safely.

## 4. Documentation alignment

`PHASE-7-API-REFERENCE.md` documents both behaviors and the new error codes. Phase 8 additions: `GET /health/chat` (operational status, counts only) and new Prometheus metrics (`PHASE-8-OPERATIONS-RUNBOOK.md`). No participant or admin endpoint changed in Phase 8.
