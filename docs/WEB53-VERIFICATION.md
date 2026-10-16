# WEB 5.3 — Cloudflare Free QA verification

Verified 2026-10-16. Continues `ab26ca0` on `codex/patagonia-wings-web4`.

**Recommendation: LISTO SOLO PARA LANZAMIENTO INFORMATIVO.** This is readiness advice, not a production deployment. Public pages have a substantial measured CPU improvement. Private Next/OpenNext requests still sometimes exceed the Free CPU budget; do not open unrestricted registration or automatic mail on this evidence.

QA: https://patagonia-wings-web51-qa.lizamaclaudio.workers.dev/

Final Worker version: `a0f64490-5a84-4030-8c91-00de204d4629`.

## 1. CPU and route classification

| Class | Delivery | Examples |
| --- | --- | --- |
| Public precompiled | 36 explicit HTML/RSC routes through Static Assets | Home, product, editions, versions, support, Founders, roadmap, community, legal, news and discovery in ES/EN/FR |
| Public dynamic reads | Small bundle of the existing route handlers; no response/session cache | Availability, database roadmap, approved proposals, anonymous/session status |
| Authenticated/dynamic | Existing OpenNext server and verified-session checks | Account, administration, proposal details |
| Sensitive writes | Existing bounded handlers, same-origin JSON validation and service-only RPCs | Login, proposals, votes, Founders, inquiries, confirmations and cancellation |
| Private operational mail | Existing protected dispatcher plus native transport | Verification, dispatch and closed single-test endpoint |

Commercial HTML no longer starts Next SSR on each visit. Only reviewed static routes are exported; authenticated pages and private data are excluded. HTML/RSC variants have distinct types and Vary headers. Internal asset URLs return 404. Static responses never set an account cookie. Roadmap and community fetch current approved database content with no-store. Existing fonts, WebP assets, galleries, reduced-motion behavior and cinematic experience are retained.

Before: Web 5.2's mixed 47-invocation sample had median 12 ms, p95 79 ms, maximum 191 ms and 25 samples above 10 ms. It is contextual evidence, not an identical-workload benchmark.

After: 800 read requests at concurrency two produced **300 valid CPU observations, 25 per route**, with no HTTP failures, rate-limit responses or observed resource terminations:

| Routes | CPU median / p95 / max (ms) |
| --- | --- |
| `/`, `/en`, `/fr`, `/ediciones`, `/versiones`, `/soporte`, `/founders-10`, `/roadmap`, `/comunidad` | 0 / 0 / 0 each |
| `/api/vector/community/roadmap` | 1 / 3 / 3 |
| `/api/vector/community/proposals` | 1 / 1 / 1 |
| `/api/vector/community/session` (anonymous) | 0 / 0 / 2 |

Zero is the platform's integer-millisecond reporting resolution, not literally zero computation. Public HTML wall-time medians were 4–5 ms; p95 varied by route from 6 to 162 ms. Database-read wall medians were 70 ms for roadmap and 140 ms for proposals; network waiting is not CPU.

Samples span two versions with the same performance implementation; differences were privacy copy and the QA mail presentation. Per-route p99 is deliberately omitted (n=25). The first observed request is not proof of a fresh isolate. Forced-cold coverage and peak memory were **not** established.

Additional private-read sample: 37 valid CPU observations. Account ES: n=9, median 8, max 154 ms; EN: n=8, median 9, max 20; FR: n=10, median 7, max 14. Anonymous admin denial: n=10, median 3, max 25. These distributions have insufficient samples for p95/p99. No terminations observed, but several exceed 10 ms. No claim that all private operations meet Free limits.

The last deployment reports startup 20 ms, distinct from request CPU. Bundle: 10,128.27 KiB, gzip 1,919.25 KiB; 204 assets. Tail does not expose peak memory. Free documents 10 ms CPU, 128 MB per isolate, 100,000 dynamic requests/day, 50 subrequests/request and six simultaneous outbound connections. [Limits](https://developers.cloudflare.com/workers/platform/limits/).

Next step for private operations: precompile the public login shell with runtime readiness, and route the existing sensitive handlers through a separately reviewed lightweight server entry. Preserve origin checks, session validation, RLS, rate limits and private headers. Re-measure real authenticated writes and cold startup. This separation is a proposal, not implemented functionality.

## 2. SMTP: delivered and closed again

Implemented a Cloudflare native TLS socket adapter for Nodemailer's existing getSocket transport. App Suite on port 465 remains the provider. Certificate/hostname verification remains enabled; no plaintext fallback, custom trust override or alternative IP is introduced. Vercel's Node transport remains available.

Authentication-only preflight succeeded before sending. After explicit approval, exactly one owner-only message with subject `[PRUEBA ÚNICA QA WEB 5.3] COPILOTO VECTOR` was accepted by SMTP. **The owner confirmed inbox arrival.** Its isolated durable receipt is `sent`; a repeated claim is denied. The neutral QA template does not claim that an inquiry or subscription was created.

The seven historical outbox deliveries remain seven. Existing queue, stable Message-ID, retry decisions and templates are retained. A native disconnect after DATA is classified delivery_unknown and cannot automatically resend. The adapter closes sockets on deadline. Five real-Nodemailer/fake-socket tests cover authentication-only, certificate failure, authentication rejection, one envelope/stable ID and ambiguous DATA disconnection.

Final flags: automatic mail false; single-test approval false. Authenticated check-only returns 403 QA_TEST_NOT_APPROVED. No cron, pg_net, mass mail or automatic retries were activated.

SPF/DKIM/DMARC **received-message Authentication-Results are still unverified**. Inbox arrival and TLS are not a substitute. No DNS or credential rotation was performed. [Native TCP/TLS](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

## 3. Supabase Auth and Community Lab

Owner-entered custom SMTP for Supabase Auth was saved using the existing provider. Confirm-signup template is versioned in `supabase/templates/community-confirmation.html`, with ES/EN/FR branches and the official ConfirmationURL. The actual owner confirmation used the Spanish flow; EN/FR branches were reviewed, not sent as extra delivery tests.

Exactly three QA return URLs were added with explicit owner approval: `/comunidad/cuenta`, `/en/comunidad/cuenta`, `/fr/comunidad/cuenta`, under the workers.dev origin. No wildcard or commercial-domain redirect was added. Existing Site URL remains localhost and requires a separate launch review.

The owner created the password, accepted privacy and submitted the private QA registration. Database verification established one owner account with email_confirmed_at, a real session and one consumed invitation intent. The owner then submitted a proposal: **one associated proposal is persisted and remains unpublished, pending moderation**. A successful HTTP response alone was not used as persistence proof.

Voting checks used the owner's actual verified identity/session in a rollback-only database integration transaction: unpublished ideas denied, approved fixture visible inside that transaction, repeated votes yield one row/count, repeated withdrawal yields zero. The fixture and all vote changes were rolled back; nothing was published. Browser voting on a publicly approved idea remains a final operational check after authorized moderation. Unit tests separately cover cookie identity, forged/unverified claims, server-only actor selection and duplicate controls.

The before-user-created Postgres hook is enabled with explicit approval. It permits only the authorized owner with a server-created SHA-256 one-use intent valid for 60 seconds. A user-editable nonce grants no role. The hook uses SECURITY INVOKER, narrowly granted Auth-role table access and RLS. Preparation RPC is service-only; anonymous/authenticated roles cannot execute either privileged function or read intents.

The QA invitation is now closed; public registration remains false. Login remains available for verified existing accounts. Both app flags and the provider guard must be reviewed before any public launch. No moderator was assigned: active moderators = zero. Existing editorial approval, abuse/rate limits and unique vote keys are retained.

Verification redirect fragments are removed from browser history. Tokens are not displayed, persisted in client storage or treated as proof of confirmation; login validates the provider identity and active database session.

## 4. Forms, history and security

Forms continue using the existing database and service-only functions. Runtime readiness avoids freezing build-time disabled flags into static HTML. QA capture remains restricted to its synthetic fixture; public real-user collection was not opened. Stored rows and separate Founders/news consent remain preserved. Final aggregate counts: nine inquiries, three newsletter subscriptions, two Founders notices; both Founders notices have marketing consent false. These totals include pre-existing records; they are not claimed as new Web 5.3 form tests.

Applied, versioned migrations:

- `20261016182151_vector_qa_smtp_once.sql`: isolated one-attempt SMTP receipt.
- `20261016183314_vector_legacy_api_hardening.sql`: two unused legacy views now security_invoker with anonymous/authenticated SELECT revoked; six invoker functions get fixed search_path. Existing service SELECT, data and function bodies retained. Dependency/source review preceded the change.
- `20261016185134_vector_owner_qa_registration_guard.sql`: private one-use owner registration intent and Auth guard; no existing user, moderator or form policy changed.

Nine HTTP permission checks passed: public roadmap/proposals readable; inquiries, subscribers, outbox, both legacy views and privileged QA RPCs denied to the public key. Database grant checks additionally cover authenticated and service roles. Provider-hook SQL tests cover wrong identity, missing nonce and replay; all temporary state rolled back. An attempted Auth-role SET ROLE test was unavailable on the managed project; do not claim it ran successfully.

Security advisor: zero ERROR, one WARN (legacy unaccent in public), 24 INFO (RLS enabled with deny-all/no public policy). Moving unaccent was deferred to avoid breaking dependencies. [Extension warning](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [deny-all policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Dependency audit: five high development-tool findings in the braces/eslint chain; current advisory lists no patched braces release. One moderate csv-parse finding is confined by current source usage to the legacy operator airport-import CLI, not a web route. No force-downgrade of Next or blind audit fix was applied. Restrict import input to trusted data and schedule a tested parser upgrade; do not describe the audit as clean. [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [csv-parse advisory](https://github.com/advisories/GHSA-8cw4-87c7-c6xx).

## 5. Visual and functional validation

- Next.js and OpenNext production build passed; TypeScript passed; 36 static routes exported, zero private pages exported; two private local defaults removed from generated environment.
- 86 existing/expanded tests plus five native SMTP tests passed. Two sandbox realpath permission failures were resolved by running the same tests outside the Windows sandbox; no assertion was relaxed.
- Focused ESLint passed for changed Auth, forms, roadmap and mail code.
- 103 HTTP smoke checks passed; nine HTTP RLS/permission checks passed; 13 static-delivery/closure checks passed.
- 18 mobile routes were measured at actual 390×844: ES/EN/FR home/editions/Founders/roadmap/community/forms and confirmation/cancellation coverage. Client and scroll widths match; no horizontal overflow in recorded cases. Menu, client navigation and gallery enlarge/next/close were exercised.
- Desktop hero captured at measured 1440×900 (client and scroll width 1425). Fresh desktop tab resolved the earlier viewport mismatch. Invalid older desktop-labelled mobile capture is excluded from evidence.
- No WPF, production, commercial DNS, PayPal, paid plan, giveaway or installer change. Protected Worker ETag and modification time exactly match the pre-work baseline.

Captures and sanitized receipts: `artifacts/web53/`. The final receipt lists portable evidence. TAKEOFF/HORIZON/COMMANDER, QA-versus-real labels, development notices and old compatible anchors remain intact. No prices or availability claims were added.

## 6. Cost, SEO, rollback and publication

Expected **hosting charge USD 0/month within Free quotas**, using the existing Supabase project and App Suite mailbox. Domain/mailbox invoices remain additional existing costs; their amounts were not verified. No paid plan was contracted. Free limits can stop service and are not an SLA. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

QA remains noindex, robots disallow and non-production sitemap. The current wrapper/build intentionally enforces preview/noindex; attaching a domain alone would not constitute a ready production configuration. Do not enable Search Console now.

Rollback: redeploy the prior known Worker version after reviewing the current bindings; keep mail and public/QA registration false. Do not remove the sent receipt, clear an ambiguous delivery, replay seven historical messages, rotate the hash, delete the owner or drop the security guard. Database migrations are additive/restrictive and remain in place; relaxing legacy grants or removing the hook needs a separate review. Vercel remains a reference environment, not a production fallback activated here.

Before `patagoniaw.com`: approve a separate production launch; review secrets and QA-versus-production hash scope; prepare an explicit production build/configuration and SEO tests; decide on informative-only access versus completing private CPU optimization; verify received Authentication-Results; authorize a moderator by verified account; finish browser voting/moderation and authenticated-write CPU tests; review real-user form intake and delivery flags. Only then request the specific DNS/domain and Auth URL changes. No such operations were performed here.
