# WEB 4.3 — security, mail and COMPLETE

Only `codex/patagonia-wings-web4` and the Vercel Preview are changed. No WPF,
production deployment, payments, DNS or historical-data deletion.

## Supabase: verified against the actual project

`pw3_settings` and `pw3_airline_hubs` had RLS disabled and all eight table
privileges granted to anon/authenticated/service_role. Anonymous REST probes with
`select=*&limit=0` returned 200 before the change, without reading any row contents.

Dependency review found no views/functions using those two tables and no inbound
foreign keys. `/api/hubs` uses the server PostgreSQL adapter; its fallback and the
separate legacy airline tables remain intact. Owner/service access is preserved.

Migration `20261014221654_web43_legacy_rls_hardening.sql` enables RLS and revokes
PUBLIC/anon/authenticated grants. After migration anonymous REST probes return
401. The rollback access suite passes **68 assertions**, including actual
SELECT/INSERT/UPDATE denials for anon/authenticated and successful synthetic
service-role insert/update. DELETE/TRUNCATE are checked through effective grants;
the test does not issue either operation. Existing row counts remain **1 and 17**.

Migration `20261015030756_vector_transactional_mail.sql` adds private mail
metadata/token tables and service-only RPCs, without backfilling historical
contacts. Real database integration passes with ROLLBACK: consent, single-cycle
deduplication, leases, fixed token expiry, confirmation, unsubscribe, bounded
retry and terminal delivery ambiguity. No synthetic records or mail jobs remain.

The final advisor has no disabled-RLS errors for these tables or new mail tables.
No-policy notices are intentional for these private tables. Other historical
findings remain outside this change: two [security-definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
six [mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
and `unaccent` in public. This is a scoped correction, not a certificate that the
entire legacy airline database is free of security findings.

## Mail

Four professional HTML/plain-text templates in ES/EN/FR cover contact receipt,
internal notification, ownership verification and subscription welcome. Requests
persist before SMTP and survive failures. Explicit POST actions confirm/cancel;
GET/scanners do not change preferences. Tokens travel in URL fragments and only
hashes are persisted. SMTP TLS validation is mandatory. Unknown delivery is held
for review instead of automatically resent; SMTP does not guarantee exactly once.

The user supplied an existing App Suite mailbox, SMTP host and port. Server-only
configuration is restricted to this branch's Preview and the approved test
recipient. A mistakenly selected Production password copy was removed. No paid
mail provider was provisioned. No credential values are included in this report.

The stored SMTP password was supplied directly in Vercel. A UI observation
included the field during entry; the user was notified to rotate it and update
the stored secret. It is never copied into source or local test files.

Submission and confirmation kick the outbox with Next `after`. A protected POST
worker is also available for an external scheduler. **Periodic draining is not
provisioned**; retries wait until another kick or authorized worker invocation.
See [mail operations](WEB43-MAIL.md). Real SMTP acceptance/inbox/confirmation-flow
verification is still pending at this commit; unit tests use a mocked transport.

## Commercial and validation

COPILOTO VECTOR COMPLETE is presented consistently in ES/EN/FR. Local modules
remain beta; Academy/Performance are planned, price unannounced, one intended
licence, no checkout. The waitlist reuses the existing form and separate consent.

- Next 16.4.1 production build and TypeScript: passed.
- 19 web tests: passed; focused ESLint and diff checks: passed.
- 62 local HTTP checks: passed, including six new localized action pages,
  method restrictions, unconfigured fail-closed responses and private worker.
- Dependency patches remove critical/high runtime advisories. One moderate
  `csv-parse` advisory remains in the legacy administrative importer; its major
  upgrade is outside the forms/mail change. Dev-only braces chain remains.
- Browser review covers desktop/mobile and all three languages; screenshots and
  additional Preview evidence are local artifacts, without credentials.

This report distinguishes tested persistence, mocked SMTP, real SMTP acceptance
and inbox delivery. Only the first two have been verified at this commit.
