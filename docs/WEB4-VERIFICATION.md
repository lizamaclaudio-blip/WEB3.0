# Web 4.0 verification — 2026-10-13

## Delivered scope
Vector-only public site, trilingual ES/EN/FR: Home, product, availability, support,
privacy and terms. Six-module keyboard-accessible gallery with a native modal,
real WPF captures and explicit fixture/illustration labels. Original SVG geometry,
owner-supplied WebP assets, responsive navigation, reduced-motion support,
canonical/hreflang/Open Graph, sitemap and product icon. No new dependencies.
Virtual airline public links removed. Its code/data, auth and ACARS preserved.
No production deployment, production branch change, payment or database migration.

## Evidence
- `npm ci`: reproducible install completed.
- `npm run build`: passes, including all existing operational routes.
- TypeScript: passes (standalone and production build).
- ESLint for all new/modified Web4 TS/TSX/test/script files: passes.
- Global `npm run lint`: fails on 7 pre-existing `no-explicit-any` errors in
  `src/app/api/simbrief/ofp/latest/route.ts`; 39 legacy warnings. Left unchanged.
- `npm run test:web4`: 6 tests pass, covering validation, consent, spam,
  payload limits, internal/public Host distinction, cross-origin denial,
  storage-confirmed responses, failure handling, hashed identifiers, French
  inquiries, locale navigation and reciprocal sitemap alternates for 18 pages.
  Storage is mocked in these tests; this is not a live Supabase certification.
- Existing read-only validators: dispatch time calculation, SimBrief flight
  number prefill and ACARS finalize pass.
- Existing aircraft capacity validator: cannot run directly in Node because its
  `@/lib` import alias is unresolved. DB-writing tests were not executed.
- `npm run smoke:web4`: 25 checks pass. Eighteen public pages and metadata respond
  200; preserved auth/ACARS reject an unauthenticated request with 401. New inquiry
  endpoint returns 503 when storage is not configured, as required.
- Initial ES/EN browser review: all 12 public routes checked at 1920 and 375 px; Home/product/support
  also checked at 1440, 768 and 390 px. No horizontal overflow or broken loaded
  images. Mobile menu/language navigation, gallery tabs/arrow-key navigation,
  modal/Escape and contact type switching verified. No console warnings/errors
  in the final navigation check.
- Captures: local `artifacts/web4-review/`, including `home-desktop.jpg`,
  `home-mobile.jpg`, `home-full.jpg`, `product-gallery.jpg`, `support-desktop.jpg`,
  `support-mobile.jpg` and JSON HTTP/responsive evidence. Not committed.

## Preview and limitations
Project `web-3.0`, team `team_7xXzbVXKUJeUnAt0HN2xc3Ax`, feature branch
`codex/patagonia-wings-web4`. Preview branch alias:
https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app
Deployment `dpl_DqpFst1owKXqa8kKeu1KZiF8zRPD` was confirmed READY with target=null
(Preview), built from commit `81a0b7965b2e58d7aa96eddac957ae7ff5928be1`:
https://web-30-9gtyhi4h8-lizamaclaudio-blips-projects.vercel.app
Production/domain/DNS and protection are unchanged.
Earlier automatic approval review rejected both the authentication-bypass fetch
tool and navigation to Vercel authentication. No bypass was used. The user chose
to complete Google/Vercel login manually; the existing Preview is now accessible
in their browser. Account permissions and production settings were not changed.
Deployment state and actual browser verification are recorded separately.

## Follow-up local review
- Reproduced and fixed keyboard focus loss when activating the current page in
  the mobile menu. Closure now returns focus to its button; Escape also closes it.
- Reject control characters in email before contacting storage. Regression
  coverage verifies a NUL-containing address returns 400 rather than storage 503.
- Rebuilt successfully with TypeScript, passed targeted ESLint and all four
  inquiry tests. The 19 local HTTP checks pass after these fixes.
- Browser checks at 390 px confirm current-page activation and Escape both close
  the menu with focus on its button, no overflow and no console warnings/errors.
  Screenshot: `artifacts/web4-review/mobile-keyboard-review.jpg`.

## Three-language rollout
- Spanish, English and French selected explicitly by the user. All six public
  page types, navigation, footer, gallery controls, captions, forms and legal
  text have French translations. Original WPF screenshots remain unchanged.
- ES / EN / FR links keep the current public page; French uses `/fr` routes.
  Server-rendered content sections carry their language, and the header syncs
  the document language after hydration and client navigation.
- Canonical URLs, three-language hreflang, `fr_FR` Open Graph and sitemap are
  updated. The existing preview-environment indexing guard is retained. The inactive inquiry service and
  unapplied SQL draft accept French; no live database migration was executed.
- Build/TypeScript, targeted ESLint, 6 tests and 25 local HTTP checks pass.
  All six French pages also pass browser content/metadata/overflow/image checks
  at 1280 px. Further Preview responsive evidence and captures are saved in
  `artifacts/web4-review/` alongside `french-local-checks.json`.
- French Preview `dpl_8E8F83M395oDxxsc46gojdfy9BFo` is READY, target=null, commit
  `a6548536c39e55e76f41764d076f2cb89608182c`:
  https://web-30-gphy8rdg9-lizamaclaudio-blips-projects.vercel.app/fr
  All six French pages pass desktop browser checks at 1920 px. Local mobile
  checks at 375 px pass; ES/EN/FR switching preserves the page in both contexts.
  French gallery arrow navigation, enlargement/Escape and the inactive contact
  form were checked. Captures: `home-fr-preview-desktop.jpg` and
  `three-language-mobile-menu.jpg`; details: `three-language-verification.json`.
- Preview indexing was not certified remotely: no robots meta was present on
  its support page, direct robots.txt navigation was blocked by the browser
  client, and platform response headers were not inspected. The source guard
  depends on Vercel providing VERCEL_ENV=preview. No protection settings changed.

Supabase env inspection returned 403 and no management connector was available.
New API/RPC adapter and isolated SQL draft are prepared, but live persistence,
RLS/grants, retention and contact/unsubscribe operations are not certified or
activated. See WEB4-FORMS.md. Existing DB-backed private workflows could not be
end-to-end tested without credentials; their source files are unchanged.

## Commercial launch pending
Verified installer/distribution, hardware support matrix, pricing/editions,
licensing/account recovery, operational support contact, newsletter delivery and
retention/deletion workflows. No fake purchase, licence, download or user metrics.
