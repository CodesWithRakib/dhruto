# Pages — Public + Auth (12 routes)

> Template: `_template.md`. All Implemented but not verified (static reads, no execution).

## Public layout (`(public)/layout.tsx`: ScrollProgress+AnnouncementBar+PublicHeader+main+PublicFooter+PublicMobileBottomNav; imports `features/{marketing,tracking,about,services,pricing,contact,privacy,terms,faq}/styles/*.css`)
- **`/`** (`(public)/page.tsx`): HomeHero+StatsStrip+PartnerMarquee+ServicesSection+StackingOperations+RateCalculatorPreview+CoverageExplorer+ProcessPipeline+Testimonials+FaqList+PartnershipContact. No API. i18n `Home`. SEO indexable (`sitemap` 18 URLs). Tests: `public-and-routes.spec.ts`.
- **`/track`** (`track/page.tsx`): TrackHero+FeaturesBento+Protocol+CTA(`register/contact`) + `PublicTrackingView` (intro search + samples `DHR-2610-00101/00107/00113`; `router.replace({trackBase}/{code})`; 5-stage progress; masked phone; Timeline; copy/share). API `GET /tracking/:code` public. States: skeleton → notFound+samples → error+retry.
- **`/track/:code`** (`track/[code]/page.tsx`): command header (Back + LIVE TELEMETRY + QuickSearch) + same view (`showIntro=false`).
- **`/services, /pricing, /about, /contact, /faq, /privacy, /terms`** (7 files): server `getTranslations` + static feature blocks (services 7; pricing cockpit+curve+tiers+matrix+FAQ; about hero+manifesto+pillars+showcase+values; contact hero+channels+smartForm+hubsExplorer+SLA+FAQ; faq container+CTA; privacy hero+maskingDemo+lifecycle+reader+DPO; terms hero+SLA+prohibited+reader+governance). No RTK Query. RECOMMENDATION: bind rate-calculator preview to `POST /pricing/calculate` or label estimate.
- System: `robots.ts` (disallow protected/auth/api), `sitemap.ts` (9 public×2), `manifest.ts` (shortcuts rely on locale redirect), icons (`icon/apple-icon/icons/*` ImageResponse), `offline/page.tsx` (PWA fallback), `[...rest]` → `not-found.tsx` (`LocaleNotFound` → `/` + `/track`), `error.tsx` (bilingual + Retry), `global-error.tsx` (unstyled root).

## Auth layout (`(auth)/layout.tsx`: brand panel + form `max-w-md`, `robots:false`)
- **`/login`** (`login/page.tsx` → `login-form.tsx`): `useLoginMutation → setCredentials → homeForRole`. Validation + show/hide pw + `signInFailed`. `rememberMe` UI-only (P3).
- **`/register`** (`register/page.tsx` → `register-form.tsx`): 6 fields (business/pickup required — friction P3), `role:MERCHANT` fixed, same persist+redirect. No ADMIN/HUB/RIDER signup; no forgot/reset (Missing F25).
- Perms: guest; backend `@Public`. Tests: `merchant-login (3), rider-login (2), auth-session (2)` + `auth-token/reauth/roles-permissions` unit.
