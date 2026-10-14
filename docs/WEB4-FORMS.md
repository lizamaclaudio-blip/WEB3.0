# Vector inquiry service

The three-language form, bounded JSON API and Supabase RPC adapter are implemented.
Real persistence is **not verified or activated**. Previously, Vercel env access
returned 403 and no Supabase management connection was available. The draft SQL
remains outside automatic migrations and never runs during a build or deployment.
No production migration, environment change or email send has been performed.

Activation requires a verified operational privacy/support contact, an agreed
retention/deletion policy, target-project schema/RLS/grants audit and successful
non-production persistence tests. A production migration requires the user's
specific final authorization. Apply the draft only to a confirmed empty test
installation first; if tables/functions already exist, review a separate upgrade
migration instead of dropping data or blindly rerunning this create-only script.
Then provision the server-only preview variables:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`VECTOR_FORM_HASH_SECRET` (random, at least 32 characters),
`VECTOR_FORMS_ENABLED=true`. Never reuse production secrets in a test environment.
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

Before activation, verify anon/authenticated cannot read/write all four tables or
execute any of the three RPCs. Verify server submission, concurrent limits,
deduplication, pending-only opt-in, token issuance only for an independently
verified active test record, one-time/expired tokens, failures and transactional
rollback. Local tests use mocked HTTP storage and do **not** establish these real
database guarantees. No database SQL execution or RLS integration test occurred.

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
