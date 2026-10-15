# WEB 4.4 — durable mail and safe rotation preflight

## Existing persistence retained

Web 4.4 reuses `vector_mail_outbox`, immutable mail token hashes and the original
inquiry/consent transactions. It creates no second queue, rewrites no form and
changes no RLS policy. Requests remain stored if SMTP or the dispatcher fails.
There is no historical backfill and no broadcast to prior contacts/subscribers.

The existing database state machine remains authoritative:

- A due `queued`/`retry` job is leased using `FOR UPDATE SKIP LOCKED`.
- At most five claims are permitted, with a fixed first-attempt anchor and a
  23-hour retry budget. Retry delays after attempts 1–4 are 60/120/240/480 seconds.
- Only definite pre-acceptance failures or explicit SMTP 4xx rejections retry.
  Permanent rejection/authentication failures are final `failed` records.
- SMTP ambiguity and expired `sending` leases are terminal `delivery_unknown`.
  No automatic worker can reopen those, `sent`, `failed` or `suppressed` jobs.
- Unique contact/cycle keys, worker leases, stable HMAC links and deterministic
  Message-ID values prevent application duplicate work. Message-ID is a trace
  identifier; SMTP does not guarantee exactly-once delivery.

The separate opt-in renewal rule still requires a new explicit request after an
expired pending cycle. It does not resend a delivered welcome or activate a
subscription by opening an email link. GET remains non-mutating.

## Dispatcher execution budget

Previously the dispatcher leased four jobs up front and checked its deadline
only before each job. A last-minute SMTP start could overrun the function, while
unused leases consumed attempts. It now claims one job at a time only when a
complete worst-case transaction fits, processing at most four jobs per call.

Mail RPCs have a real abortable five-second timeout; existing form RPCs retain
their eight-second default. SMTP retains a hard twelve-second timeout. Admission
reserves 32 seconds: claim, optional token registration, start, final result
acknowledgement and SMTP. A monotonic clock governs the 45-second dispatch budget
within the routes' 60-second limit. A failed final acknowledgement stops the
invocation; durable `sending` state later becomes unknown rather than resent.
No unused batch is leased near the deadline.

Next `after` is an immediate kick after a committed form/confirmation response,
not a periodic scheduler. The protected POST worker remains available at
`/api/vector/mail/dispatch`. It accepts only the existing worker bearer secret,
returns aggregate counts and contains no caller-supplied recipient/send API.
Scheduler provisioning and platform-plan evidence are recorded separately; this
document does not claim an automatic scheduler has been activated.

## SMTP password rotation preflight

`POST /api/vector/mail/verify` uses the same private worker authorization. It
checks trusted server configuration and performs only Nodemailer's `verify()`:
DNS/connection, mandatory verified TLS and authentication. It never calls
`sendMail`, reads the outbox, changes a subscription or stores supplied settings.
It has a twelve-second hard deadline and a thirty-second route limit.

Delivery can remain disabled while this preflight runs. The readiness check
overrides the enabled flag in its own memory only; no environment variable is
changed. Success returns `SMTP_VERIFIED`; failures expose a fixed error code,
never a password, provider response, mailbox address or SMTP diagnostic body.
Mail modules use the Next.js `server-only` guard to prevent client imports.

Safe operational sequence:

1. Pause scheduled delivery and disable mail in the branch's Preview settings.
2. Rotate the password directly with the mailbox provider. Store its replacement
   only in the sensitive server environment variable `VECTOR_SMTP_PASSWORD`;
   never in chat, source, command arguments, logs or reports.
3. Deploy the branch Preview with the changed variable and use the authorized
   verification endpoint while delivery stays disabled.
4. Re-enable delivery only after successful authentication, preserving the
   Preview recipient allowlist. Do not reopen old sent/unknown/final jobs.

This check proves SMTP TLS/authentication only. It does not prove inbox placement
or SPF/DKIM/DMARC results; those require separate authorized DNS and received-mail
evidence. Changing DKIM/DNS is not part of the preflight or this implementation.

## Verification scope

`tests/web4/mail.test.mjs` covers ES/EN/FR templates, secure configuration,
Preview allowlists, immutable action links, SMTP fault classification, hard
timeouts, TLS/authentication preflight, worker authorization, budget admission,
stable retry messages, duplicate queue responses and confirmation outcomes.
SMTP is mocked: these tests send no mail to the owner or third parties.

`docs/supabase/web44-mail-retries.integration.sql` checks exact backoff,
attempt/time limits, fixed first-attempt timestamps, terminal acknowledgements,
delivery ambiguity and survival of the stored request. It uses new synthetic
records under `qa-vector.example.org`, makes no SMTP calls and rolls back all
test changes. Never run a worker while its transaction is open. Actual execution
results belong in the Web 4.4 verification report, not inferred from this script.
