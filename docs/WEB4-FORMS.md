# Vector inquiry service

The three-language form, bounded JSON API and Supabase RPC adapter are implemented.
On 2026-10-14 the Supabase connection became available. The initial isolated
schema was applied to the user-specified project `donguccheqjqyzudowuy` under
migration `vector_private_inquiry_service`, after confirming all target names
were absent. Real SQL persistence, consent, deduplication, limits and unsubscribe
tests passed inside a rolled-back transaction. Existing airline tables were
preserved. The initial SQL never runs during a build or deployment.

Vercel configuration is limited to Preview branch `codex/patagonia-wings-web4`.
The user entered a dedicated server key directly into Vercel; it was not read,
printed or committed. The browser-to-API-to-row check is recorded in the delivery
evidence after the new Preview build. No production website release, production
environment variable change, DNS change, payment activation or email send.

Public production collection requires a verified operational privacy/support contact, an agreed
retention/deletion policy, target-project schema/RLS/grants audit and successful
non-production persistence tests. A production migration requires the user's
specific final authorization. Apply the draft only to a confirmed empty test
installation first; if tables/functions already exist, review a separate upgrade
migration instead of dropping data or blindly rerunning this create-only script.
Server-only Preview variables:
`SUPABASE_URL`, `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` fallback),
`VECTOR_FORM_HASH_SECRET` (random, at least 32 characters),
`VECTOR_FORMS_ENABLED=true`. Never reuse production secrets in a test environment.
Modern `sb_secret_` keys are sent only in `apikey`; legacy JWT keys retain their
Bearer header. Neither key is exposed through a `NEXT_PUBLIC_` variable.
Publishable keys cannot enable the server-only form. An initial browser test
with a publishable key was correctly rejected by PostgREST (401 / 42501), stored
no row and displayed a failure rather than a false confirmation.
Preview forms identify themselves as tests and request fictional data.
The form mode defaults to tests independently of inherited Vercel variables.
`VECTOR_FORMS_MODE=public` is reserved for a separately authorized public launch;
it is not configured by this work.
No new production environment variables have been changed.

`POST /api/vector/inquiry` validates same-host Origin, exact JSON content type,
bounded streamed payload (8 KiB), request consent, optional newsletter consent,
email, optional name, lengths and honeypot. Newsletter consent accepts a boolean
only; missing/false means no opt-in. The database owns consent timestamps.
Durable hourly limits are transactional per HMAC IP/email bucket (5/3 attempts).
Vercel's overwritten forwarding header is used; outside Vercel one shared bucket
is used instead of trusting caller IP claims. Raw IPs are not stored. Only RPC
`accepted` produces success; unavailable/unconfigured storage returns 503 and
limits return 429. Responses are not cached. No new account or payment system.

Optional news consent is **separate and unchecked**, for either contact or interest
requests. A submission never subscribes automatically. The request stores the
choice, consent version and opt-in timestamp. Explicit opt-in additionally upserts
one newsletter record per normalized email/HMAC, initially `pending`. Repeat
requests do not duplicate subscriptions. An unchecked box does not cancel an
existing preference; an unsubscribe action or verified privacy request does.
Resubmitting explicit opt-in after a cancellation returns the record to `pending`,
not `active`. Only verified email ownership may later activate delivery.

No verification emails, newsletters or unsubscribe emails are sent. Provider
selection, email-ownership confirmation and delivery remain unimplemented. The
UI says the preference is recorded, not that delivery or a subscription is active.

Prepared opt-out transport: the server-only `issueUnsubscribeToken` helper creates
32 random bytes and registers only their SHA-256 hash, with 30-day expiry. The RPC
refuses pending/unsubscribed records. The future verified mailer may use the raw
token only in memory; never log/store it. A future email link must put it in a URL
fragment and show an explicit confirmation page, which submits a same-origin
`POST /api/vector/unsubscribe` body. That page, expiry/reissue recovery and mailer
are still pending. GET/navigation/email scanners cannot consume the POST token.
The RPC atomically consumes it once, unsubscribes the record and invalidates all
its remaining tokens. Reused/expired tokens return 410, unconfigured storage 503,
and a separate durable 20/hour IP bucket returns 429. No email address is accepted
by the public opt-out API, preventing email-based enumeration or cancellation.

Verified: anon/authenticated have no effective SELECT/INSERT/UPDATE/DELETE
privilege on the four RLS-enabled tables and cannot execute any of the three
RPCs; service_role can execute them. No public table policies are installed,
intentionally denying direct client access. Security advisors report this
deny-by-default design as informational, not an exposure requiring a public policy.
Verify server submission, concurrent limits,
deduplication, pending-only opt-in, token issuance only for an independently
verified active test record, one-time/expired tokens, failures and transactional
rollback. `docs/supabase/vector-inquiries.integration.sql` now verifies the actual
database RPCs: contact persistence without implicit opt-in, consent timestamps,
pending-only deduplication, three-per-email/five-per-IP limits, validation with
no side effects, token issuance restrictions, expired/single-use tokens and
the unsubscribe limit. It returned `integration_outcome: passed`; subsequent
counts of all four tables were zero. Local HTTP mocks remain separate evidence.

Pre-existing security findings are outside this additive forms migration:
`pw3_settings` and `pw3_airline_hubs` lack RLS; `pw_v_airline_hubs` and
`pw_v_public_stats` use definer views. Existing mutable function search paths and
the public `unaccent` extension also remain. Review their original access model
before any remediation; enabling RLS blindly could break the retained airline.
See [Supabase RLS remediation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
and [view remediation](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).

There is no public admin UI. An authorized operator must verify the requester
before access/correction/deletion. Resolve their normalized email to the existing
HMAC without exposing the secret, then execute bound-parameter statements in one
reviewed transaction: delete matching `vector_inquiries.email_hash`, delete the
matching `vector_newsletter_subscriptions.email_hash` (cascades token deletion),
and delete its `vector_inquiry_limits.bucket_key = 'email:' || $1`. Never interpolate
an email/hash into SQL. Review backup retention separately. Contact-record expiry
uses an explicitly approved cutoff on `vector_inquiries.created_at`; do not invent
a retention period or automatically erase live subscriptions. No scheduled purge
or production deletion is enabled by this work.

Keep the HMAC secret stable; rotating it requires a reviewed rehash/dedup plan for
existing records. Persist no raw tokens or IPs in logs, analytics or query URLs.
