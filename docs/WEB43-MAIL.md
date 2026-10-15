# Transactional email service

The existing inquiry endpoint and its accepted response are unchanged. A private,
durable database outbox is inserted in the same transaction as the request. SMTP
failure never removes a request or changes a successful storage acknowledgement.
The implementation uses a replaceable SMTP adapter, not Gmail browser automation,
and does not activate a paid mail provider.

## External configuration still required

Delivery defaults to disabled. Set server-only variables in the development branch
Preview only, using the mailbox provider's verified settings (do not guess):

- `VECTOR_MAIL_ENABLED=true` only after the remaining settings are verified.
- `VECTOR_SMTP_HOST`, `VECTOR_SMTP_PORT` (465 implicit TLS or 587 required STARTTLS).
- `VECTOR_SMTP_USER`, `VECTOR_SMTP_PASSWORD` (provider-specific app password where required).
- `VECTOR_MAIL_FROM`, `VECTOR_MAIL_INTERNAL_TO`: approved mailbox addresses only.
- `VECTOR_MAIL_PUBLIC_ORIGIN`: the stable HTTPS Preview origin that owns token pages.
- `VECTOR_MAIL_TOKEN_SECRET`, `VECTOR_MAIL_WORKER_SECRET`: independent random secrets,
  at least 32 characters; never public variables or committed source.
- `VECTOR_MAIL_PREVIEW_RECIPIENTS`: exact comma-separated approved test addresses;
  both source and internal recipient must be allowed in Preview. Reserved example,
  `.test`, `.invalid` and localhost recipients never receive mail.

The existing Supabase server variables remain required. Credentials stay in Vercel;
they are never included in templates, browser code, logs or this document. Keep the
token secret stable until outstanding jobs finish. Sender DNS, SPF/DKIM/DMARC and
mailbox SMTP access must be checked with the provider; creating a mailbox alone
does not verify SMTP delivery or inbox placement.

Accepted inquiries and successful confirmations schedule a nonblocking Next `after`
dispatch. The response still acknowledges persistence, never SMTP delivery.
No periodic scheduler is provisioned. Invoke `POST /api/vector/mail/dispatch` from an approved
server-side scheduler with `Authorization: Bearer <VECTOR_MAIL_WORKER_SECRET>`.
Each call leases at most four jobs. Do not place its secret in a public page or URL.
No bulk newsletter broadcast, checkout, paid service or production launch is enabled.

## Delivery and consent semantics

Four localized HTML/plain-text templates cover contact receipt, internal contact
notification, ownership confirmation and subscription welcome. Contact messages
are HTML-escaped; internal notification goes only to a configured mailbox. Receipt
confirms storage, not a response deadline, purchase, licence or future feature.

Explicit optional opt-in creates a pending subscription. A 24-hour verification
link opens an ES/EN/FR page; only a deliberate same-origin POST activates it. Welcome
mail carries a 30-day unsubscribe link. Opening links alone does not consume them,
so email scanners cannot confirm or cancel preferences. The browser receives the
token in a URL fragment, removes it from its address and keeps it only in memory.
Only SHA-256 token hashes persist. Expired or consumed tokens return 410.

Queue ownership, short leases and unique job keys prevent concurrent duplicate
dispatch. A deterministic HMAC token and Message-ID remain stable across retries.
SMTP has **no guaranteed idempotency**: Message-ID is a trace identifier, not an
exactly-once guarantee. Definite pre-acceptance failures or explicit temporary SMTP
rejections retry with bounded database backoff. Timeouts/connection loss during
DATA, unexpected exceptions and expired sending leases become `delivery_unknown`
and require operator review; they are never blindly retried. A successful SMTP
acceptance means accepted by that server, not verified inbox delivery.

Failures store restricted error codes and a trace identifier, never raw provider
responses, SMTP credentials, tokens or message bodies in logs. The source inquiry
remains available for authorized handling even after retries stop. Test evidence
must distinguish mocked SMTP acceptance from a real provider/inbox check.

## Verification

`node --test tests/web4/mail.test.mjs` checks fail-closed configuration, Preview
allowlists, SMTP TLS/envelope protection, all twelve localized templates, escaped
content, token privacy/stability, durable retries, ambiguity handling, dedup claims,
confirmation validation, one-time database outcomes and worker authorization.
Provider calls are mocked: no real emails are sent by these tests.

Database migration/security evidence is documented separately. Before announcing
delivery as operational, verify a configured Preview through actual mailbox SMTP,
one approved receipt, internal notification, explicit confirmation and unsubscribe;
inspect only synthetic test references and sanitized status, never private content.
