# Dhruto — Frontend Architecture

## 1. Applications

```text
apps/web-admin
apps/web-merchant
apps/tracker
```

Rider experience is initially a mobile-first web/PWA surface and can later become a native app.

## 2. Stack

Recommended:

- Next.js
- TypeScript
- Redux Toolkit
- RTK Query
- React Hook Form
- Zod
- Tailwind CSS
- Shared UI package
- Centralized design tokens

## 3. Feature Architecture

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── parcels/
│   ├── tracking/
│   ├── finance/
│   ├── hubs/
│   ├── riders/
│   └── analytics/
├── components/
├── lib/
├── hooks/
├── store/
├── types/
└── config/
```

Each feature should own its:

- API endpoints
- types
- schemas
- hooks
- components
- utilities

## 4. State Management

Server state:

- RTK Query

Global client state only when necessary:

- auth/session
- UI preferences
- scanner state
- temporary workflow state

Do not duplicate server state in Redux unnecessarily.

## 5. Forms

All important forms must use:

```text
React Hook Form + Zod
```

Client validation improves UX but backend validation remains authoritative.

## 6. API Types

Frontend types should be generated or centrally synchronized with backend OpenAPI where practical.

No `any`.

## 7. Route Protection

Use both:

- route-level authentication
- server/API authorization

Frontend guards are UX/security-in-depth, not the final authorization boundary.

## 8. Permission-Based UI

Buttons/actions should be rendered based on permission.

Examples:

```text
parcel.create
parcel.transition
parcel.assign
finance.payout.create
hub.scan
cash.verify
```

Backend must enforce the same permission independently.

## 9. Design System

Rules:

- no gradients
- restrained color palette
- centralized tokens
- minimal unnecessary borders
- minimal shadows
- consistent spacing
- consistent typography
- responsive
- accessible
- reusable data tables
- reusable filters
- reusable modals
- reusable status badges
- reusable form controls

## 10. Required UI States

Every async screen should support:

```text
Loading
Success
Empty
Error
Retry
Permission Denied
Partial Failure
```

## 11. Tables

Tables should support where applicable:

- server-side pagination
- filtering
- sorting
- search
- column visibility
- row actions
- bulk actions
- responsive fallback

## 12. Scanner UX

Scanner screen must support:

- USB/Bluetooth keyboard-like barcode input
- camera scanner
- continuous scanning
- success feedback
- duplicate scan handling
- invalid scan feedback
- network failure queue/retry where appropriate

## 13. Merchant Bulk Import UX

Flow:

```text
Upload
→ Parse
→ Preview
→ Validate
→ Error Report
→ Confirm
→ Submit
→ Processing
→ Result
```

Never create partial orders silently.

## 14. Tracker UX

Optimize for:

- low bandwidth
- mobile screens
- fast first render
- simple status timeline
- safe data exposure

## 15. Frontend Error Handling

Centralize API error normalization.

Display user-friendly messages while preserving technical details in logs/monitoring.

## 16. Testing

- component tests
- hook tests
- schema tests
- API integration tests
- E2E tests for critical journeys

Critical E2E:

- merchant creates order
- bulk import
- hub scan
- rider delivery
- COD verification
- merchant payout
- public tracking

## 17. Implemented Routes (Phase 1)

The filesystem mirrors the centralized map in
`apps/web-merchant/config/routes.ts` through Next.js route groups, which do not
appear in the URL. Locale is always the first segment (`en` | `bn`).

| Route                                                                                  | Group             | Access                |
| -------------------------------------------------------------------------------------- | ----------------- | --------------------- |
| `/`                                                                                    | `(public)`        | public                |
| `/track`                                                                               | `(public)`        | public                |
| `/track/[code]`                                                                        | `(public)`        | public                |
| `/services`, `/pricing`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms`            | `(public)`        | public                |
| `/login`, `/register`                                                                  | `(auth)`          | public form           |
| `/merchant/dashboard`                                                                  | `(merchant)`      | merchant              |
| `/merchant/bookings/new`                                                               | `(merchant)`      | merchant              |
| `/merchant/parcels`                                                                    | `(merchant)`      | merchant              |
| `/merchant/parcels/[id]`                                                               | `(merchant)`      | merchant (owner only) |
| `/merchant/parcels/[id]/label`                                                         | `(merchant)`      | merchant (owner only) |
| `/merchant/finance`                                                                    | `(merchant)`      | merchant              |
| `/merchant/analytics`                                                                  | `(merchant)`      | merchant              |
| `/merchant/intelligence`                                                               | `(merchant)`      | merchant              |
| `/merchant/track`, `/merchant/track/[code]`                                            | `(merchant)`      | merchant              |
| `/merchant/developer/webhooks`                                                         | `(merchant)`      | merchant              |
| `/analytics`                                                                           | none (standalone) | public                |
| `/admin/dashboard`, `/admin/analytics`, `/admin/finance`, `/admin/hub`, `/admin/rider` | `(admin)`         | admin                 |
| `/admin/parcels`, `/admin/parcels/[id]`, `/admin/parcels/[id]/label`                   | `(admin)`         | admin                 |
| `/admin/track`, `/admin/track/[code]`                                                  | `(admin)`         | admin                 |
| `/hub/dashboard`                                                                       | `(hub)`           | hub manager           |
| `/hub/scanner`, `/hub/parcels`                                                         | `(hub)`           | hub manager           |
| `/hub/bags`, `/hub/bags/[id]`                                                          | `(hub)`           | hub manager           |
| `/hub/manifests`, `/hub/manifests/[id]`, `/hub/exceptions`                             | `(hub)`           | hub manager           |
| `/hub/cash`                                                                            | `(hub)`           | hub manager           |
| `/rider/dashboard`                                                                     | `(rider)`         | rider                 |
| `/rider/tasks`, `/rider/tasks/[id]`, `/rider/history`, `/rider/profile`                | `(rider)`         | rider                 |

The catch-all `[[...rest]]` page renders the styled not-found state for unknown
routes, and `/offline` is the PWA offline fallback.

Legacy unprefixed URLs are kept working with permanent (`308`) redirects handled
by `proxy.ts`, e.g. `/dashboard` -> `/merchant/dashboard`, `/parcels` ->
`/merchant/parcels`, `/bookings/new` -> `/merchant/bookings/new`, `/finance` ->
`/merchant/finance`, `/hub` -> `/hub/dashboard`, `/rider` -> `/rider/dashboard`.

Routes carry no merchant identity in the URL: the API resolves the owning
merchant from the bearer token, and a request for a parcel owned by another
merchant is rendered as not found.
