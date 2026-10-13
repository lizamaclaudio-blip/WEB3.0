# Vector inquiry service

The UI, bounded JSON API and Supabase RPC adapter are implemented. Production
persistence is **not verified or activated**. Vercel env access returned 403 and
no Supabase management connection was available. Do not apply the draft SQL until
the correct project's schema/RLS/grants have been audited. It is deliberately
outside automatic migrations and does not run during a build or deployment.

Activation requires a verified operational contact, retention/deletion process,
target-project audit and a successful non-production persistence test. Then set
server-only preview variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`VECTOR_FORM_HASH_SECRET` (random, at least 32 characters),
`VECTOR_FORMS_ENABLED=true`. Never reuse production secrets in a test environment.
No new production environment variables have been changed.

The API validates origin, content type, payload size (8 KiB including chunked
bodies), consent, email, lengths and honeypot. Durable hourly request limits are
transactional per HMAC IP/email bucket; Vercel's overwritten forwarding header is
used instead of trusting client IP claims. Raw IPs are not stored. Only a confirmed
RPC `accepted` response produces success; unavailable storage returns 503. No
anonymous table reads, client service key, new account system or payment service.

Before activation, verify anon/authenticated cannot read or write either table,
cannot invoke the RPC, service role can submit, and simultaneous requests hit the
limits. Test expiry, failure responses, deletion workflow and retention. The draft
does not add a public admin UI. Data may be reviewed only through authorised
server/admin access. Newsletter delivery and unsubscribe service remain pending;
the form currently records interest only, not a paid subscription.
