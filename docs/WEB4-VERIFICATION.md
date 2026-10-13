# Web 4.0 verification — 2026-10-13

## Delivered scope
Vector-only public site, bilingual ES/EN: Home, product, availability, support,
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
- `npm run test:web4`: 4 tests pass, covering validation, consent, spam,
  payload limits, internal/public Host distinction, cross-origin denial,
  storage-confirmed responses, failure handling and hashed identifiers.
  Storage is mocked in these tests; this is not a live Supabase certification.
- Existing read-only validators: dispatch time calculation, SimBrief flight
  number prefill and ACARS finalize pass.
- Existing aircraft capacity validator: cannot run directly in Node because its
  `@/lib` import alias is unresolved. DB-writing tests were not executed.
- `npm run smoke:web4`: 19 checks pass. Twelve public pages and metadata respond
  200; preserved auth/ACARS reject an unauthenticated request with 401. New inquiry
  endpoint returns 503 when storage is not configured, as required.
- Browser: all 12 public routes checked at 1920 and 375 px; Home/product/support
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
The first deployment reached READY with target=null (Preview). The final revision
is deployed on the same branch. Production/domain/DNS and protection are unchanged.
Remote browser verification is blocked by automatic approval review: it rejected
both the authentication-bypass fetch tool and navigation to Vercel authentication.
No bypass was used. Local browser verification and Vercel build status are separate.

Supabase env inspection returned 403 and no management connector was available.
New API/RPC adapter and isolated SQL draft are prepared, but live persistence,
RLS/grants, retention and contact/unsubscribe operations are not certified or
activated. See WEB4-FORMS.md. Existing DB-backed private workflows could not be
end-to-end tested without credentials; their source files are unchanged.

## Commercial launch pending
Verified installer/distribution, hardware support matrix, pricing/editions,
licensing/account recovery, operational support contact, newsletter delivery and
retention/deletion workflows. No fake purchase, licence, download or user metrics.
