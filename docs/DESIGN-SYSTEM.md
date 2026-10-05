# Dhruto — Design System

This document is the UI source of truth for every Dhruto surface
(public website, merchant portal, hub operations, rider terminal).
It describes the tokens, components, layout rules and accessibility
requirements that all future work must follow.

---

## 1. Principles

1. **One product, many surfaces.** A customer, merchant, hub manager and rider
   must feel they are using the same product. Same tokens, same components,
   same spacing rhythm.
2. **Semantic tokens only.** Application components never contain raw colours.
3. **No shadows, minimal borders.** Separation comes from spacing, typography
   and surface contrast — not elevation or outlines.
4. **Bilingual first.** English and Bangla are equally first-class. Bangla is
   **LTR**, not RTL.
5. **Mobile is the default.** Rider and hub workflows are mobile-first.
6. **Every async screen has four states:** loading, empty, error, success.

---

## 2. Colour token architecture

All colour lives in **one file**:

```
packages/ui/src/styles/tokens.css
```

Tokens are stored as raw HSL triples (no `hsl()` wrapper) so Tailwind can
compose opacity, e.g. `hsl(var(--primary) / 0.5)`.

The Tailwind preset (`packages/ui/tailwind.preset.js`) maps every token to a
semantic utility. **Changing `--primary` in `tokens.css` re-themes the entire
product.**

### 2.1 Palette

| Token | Value | Utility | Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `#F8FAFC` | `bg-background` | Page wash |
| `--surface` | `#FFFFFF` | `bg-surface` | Cards, panels, sheets |
| `--surface-muted` | `#F1F5F9` | `bg-surface-muted` | Subtle section separation |
| `--foreground` / `--text-primary` | `#0F172A` | `text-foreground` | Primary text |
| `--text-secondary` | `#64748B` | `text-muted-foreground` | Secondary text |
| `--text-muted` | `#94A3B8` | `text-muted` | Tertiary / disabled |
| `--primary` | `#16A34A` | `bg-primary` / `text-primary` | Brand, primary action |
| `--primary-hover` | `#15803D` | `bg-primary-hover` | Primary hover |
| `--primary-soft` | `#DCFCE7` | `bg-primary-soft` | Tinted surfaces, active nav |
| `--success` | `#16A34A` | `text-success` / `bg-success` | Delivered, verified |
| `--warning` | `#F59E0B` | `text-warning` / `bg-warning` | Pending, attention |
| `--danger` | `#EF4444` | `text-danger` / `bg-danger` | Failed, destructive |
| `--info` | `#3B82F6` | `text-info` / `bg-info` | Neutral information |
| `--border` | `#E2E8F0` | `border-border` | Structural lines only |
| `--ring` | `#16A34A` | `ring-ring` | Focus indicator |

Each state colour has a matching **soft** pair (`bg-success-soft` +
`text-success-soft-foreground`) for status chips. **Soft variants are the
default for status in tables, lists and timelines.**

### 2.2 Rules

**Never write raw colours in application components.** These are all wrong:

```tsx
<p className="text-green-600">…</p>
<div className="bg-[#16A34A]" />
<div style={{ color: "#16A34A" }} />
```

Write this instead:

```tsx
<p className="text-success">…</p>
<div className="bg-primary" />
```

Raw colours are acceptable **only** inside `tokens.css` and the Tailwind preset.

---

## 3. Typography

### 3.1 Fonts

| Language | Family | Injected as |
| :--- | :--- | :--- |
| English | **Inter** | `--font-inter` (via `next/font/google`) |
| Bangla | **Noto Sans Bengali** | `--font-bangla` (via `next/font/google`) |

Both are loaded in `apps/web-merchant/app/[locale]/layout.tsx` and assigned to
the `--font-sans` / `--font-bangla` token variables.

`:lang(bn)` automatically switches to the Bangla stack and applies a roomier
line-height (`--leading-bangla: 1.75`), because Bangla needs more vertical
space than Latin at the same size.

### 3.2 Scale

Utilities are defined in the Tailwind preset, so sizes are consistent
everywhere instead of ad-hoc `text-lg` / `text-xl` choices.

| Utility | Size | Use |
| :--- | :--- | :--- |
| `text-display` | 36px / 700 | Hero headlines |
| `text-h1` | 28px / 700 | Page titles |
| `text-h2` | 22px / 700 | Section titles |
| `text-h3` | 18px / 600 | Card / modal titles |
| `text-h4` | 16px / 600 | Sub-headings |
| `text-body` | 14px / 1.6 | Body copy |
| `text-body-sm` | 13px | Dense body copy |
| `text-label` | 13px / 500 | Form labels |
| `text-caption` | 12px | Metadata, table headers |
| `text-table` | 13px | Tabular data |

Tracking codes, money and weights use `.tabular-nums` or `font-mono` so digits
align column-wise.

---

## 4. Spacing, radius and elevation

- **Spacing** follows a 4px grid. Section padding uses `py-14 sm:py-20`;
  card padding uses `p-5 sm:p-6`; card grids use `gap-4`.
- **Radius** has one rhythm: `rounded-sm` (badges), `rounded-md` (buttons,
  inputs), `rounded-lg` (cards), `rounded-xl` (sheets, hero surfaces).
- **Elevation: none.** Shadows are not used. `shadow-*` is not part of the
  system — separation comes from `bg-surface` vs `bg-background` and from the
  shared 1px `border-border` where a line is structurally useful.

Borders are allowed only for: inputs, table separators, section dividers,
selected controls, and focus rings. **Do not put a border around every card.**

---

## 5. Components

### 5.1 Generic (`@dhruto/ui`)

`Button`, `Badge`, `Card`, `Input`, `Label`, `Select`, `Form*`, `Toaster`,
`Logo`, `LanguageSwitcher` — these contain **no Dhruto business logic**.

| Component | Notes |
| :--- | :--- |
| `Button` | Variants: `default`, `secondary`, `soft`, `outline`, `ghost`, `destructive`, `link`. Sizes: `sm`, `default` (**44px**), `lg`, `icon`, `icon-sm`. Supports `loading`. |
| `Badge` | Solid (`success`, `warning`, `danger`, `info`) and soft (`*-soft`) variants. |
| `Card` | Border + surface only, no shadow. |
| `Input` | 44px tall, `error` prop sets `aria-invalid`. |
| `Logo` | The only place the Dhruto brand lockup is defined. |

> **Important:** `@dhruto/ui`'s barrel re-exports client components, so it is a
> client boundary. **Server components must not import `cn` from `@dhruto/ui`.**
> Use `@/lib/cn` in the app instead.

### 5.2 Application components (`apps/web-merchant`)

`PageHeader`, `EmptyState`, `PublicHeader`, `PublicFooter`, `DashboardShell`,
`AppShell`, `TrackingQuickSearch`, marketing `Section`/`FeatureGrid`/`StepFlow`/`FaqList`.

Domain components stay in `features/*/components` and never move into the
shared UI package.

### 5.3 Status

Parcel status is a domain concept. Status → semantic tone mapping lives with the
parcel feature, not inside presentational components, so tables, cards,
timelines and the public tracker all resolve the same colours:

```tsx
// Good
<Badge variant={statusTone(status)}>{statusLabel(status)}</Badge>

// Bad
<span className={status === "DELIVERED" ? "text-green-500" : ""} />
```

---

## 6. Layout & navigation

| Shell | Routes | Chrome |
| :--- | :--- | :--- |
| **Public** | `/`, `/track`, `/services`, `/pricing`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms` | `PublicHeader` + `PublicFooter` |
| **Auth** | `/login`, `/register` | Distraction-free, no public nav |
| **Dashboard** | `/dashboard`, `/parcels`, `/bookings`, `/finance`, `/hub`, `/rider`, `/intelligence`, `/developer` | `DashboardShell` |

`AppShell` resolves the surface from the pathname — this is the **only** place
that decides which chrome wraps a route. Do not render a header or footer inside
a page.

### 6.1 Navigation is configuration-driven

`lib/nav-config.ts` is the single source of truth. Adding an item once makes it
appear in the desktop sidebar, the mobile drawer and the mobile bottom bar for
exactly the roles allowed. **Never scatter `role === "…"` checks through
components.**

```ts
export const DASHBOARD_NAV: NavGroup[] = [ /* groups → items → roles[] */ ];
```

Roles mirror the API `UserRole`: `ADMIN`, `MERCHANT`, `RIDER`, `HUB_MANAGER`,
`CUSTOMER`. **Hiding a nav item is UX, not security — the API enforces
authorization independently.**

### 6.2 Mobile

- Bottom navigation shows up to four role-specific items.
- Bottom nav respects safe areas via `.pb-safe`
  (`env(safe-area-inset-bottom)`); content adds `pb-28` so the bar never covers it.
- Primary mobile actions are ≥44px tall and reachable one-handed.
- The public menu is a collapsible panel; the dashboard menu is a drawer.

---

## 7. Responsive rules

Design and test at **320, 360, 375, 390, 414, 768, 1024, 1280, 1440+**.

- Never solve overflow by shrinking everything — change the layout.
- Tables get a stacked card fallback on small screens rather than a wide
  horizontal scroll for scannable data (tracking code, recipient, destination,
  COD, status).
- Long strings (tracking codes, emails) use `truncate` or `break-words` inside a
  `min-w-0` container.
- Content width is capped by `.dhruto-container` (max 6xl), not ad-hoc padding.

---

## 8. Accessibility

- One visible focus treatment: `:focus-visible` → 2px `--ring` with 2px offset.
  **Never remove focus indicators for aesthetics.**
- Every public/dashboard layout provides a **skip link** to `#main-content`.
- Icon-only controls require `aria-label`; decorative icons use `aria-hidden`.
- Inputs have real `<label>`s; errors are associated with `aria-describedby`
  and `aria-invalid`, and are shown near the field — not only in a toast.
- Active nav uses `aria-current="page"`; the language switch uses `aria-pressed`.
- Contrast: `--text-secondary` on `--surface` and all `*-soft-foreground` pairs
  are chosen to meet WCAG AA.
- Async updates announce via `role="status"` / `aria-live="polite"`.
- Animation is limited to menus, sheets, loading and hover, and is disabled
  under `prefers-reduced-motion`.

---

## 9. Bilingual & i18n

- Every user-facing string lives in `messages/en.json` and `messages/bn.json`.
  Both files must stay at key parity.
- **Bangla is LTR.** `dir="ltr"` for both locales. The layout stays
  direction-aware so a future RTL language can be added.
- Bangla copy is written as natural UI phrasing, not literal word-for-word
  translation.
- Locale is prefixed in the URL (`/en/...`, `/bn/...`) and handled by
  `next-intl` middleware.

---

## 10. SEO

- Public pages export `metadata` with title, description and a canonical path.
- **Authenticated surfaces set `robots: { index: false, follow: false }`.**
- `app/sitemap.ts` lists public routes only, with `hreflang` alternates.
- `app/robots.ts` disallows dashboard, auth and API paths.
- Root layout defines `metadataBase`, title template, Open Graph and Twitter
  defaults.

---

## 11. Data & state

- Server state uses **RTK Query**. Do not add another data-fetching library.
- Do not mirror server data into Redux — global state is for auth/session,
  UI preferences and temporary workflow state only.
- Keep client components narrow. Pages are server components unless
  interactivity requires otherwise.
- Centralise API error normalization (`lib/api-error.ts`) and show friendly
  messages while logging technical detail.

---

## 12. Checklist for new UI

- [ ] No raw colours, hex values, `rgb()`, gradients or inline colour styles
- [ ] No shadows; borders only where structurally justified
- [ ] Uses the shared type scale, not ad-hoc sizes
- [ ] Uses `rounded-*` from the token rhythm
- [ ] Strings added to **both** `en.json` and `bn.json`
- [ ] Loading, empty, error and success states handled
- [ ] Works at 320px with no horizontal overflow
- [ ] Keyboard accessible with a visible focus ring
- [ ] Touch targets ≥44px on mobile
- [ ] Server components do not import `cn` from `@dhruto/ui`
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` pass