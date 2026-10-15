# Mail DNS change prepared for review — patagoniaw.com

**Applied with explicit user authorization.** The website remains on its current deployment; this plan concerns
the real email domain, outside the branch-scoped Preview environment.

Verified: authoritative nameservers are `ns1.vercel-dns.com` and
`ns2.vercel-dns.com`. Vercel's zone contains the existing website A/CNAME/default
records and no MX/TXT mail records. The Registros email service is active with one
mailbox and supplies the standard `smtp.us.appsuite.cloud` endpoint. SMTP accepted
three approved test messages, but the user reports they did not arrive.

These five records were added in Vercel, preserving every existing website record:

| Type | Name | Value | Priority | TTL |
| --- | --- | --- | --- | --- |
| MX | @ | mx001.cloudus.xion.oxcs.net | 10 | 60 |
| MX | @ | mx002.cloudus.xion.oxcs.net | 10 | 60 |
| MX | @ | mx003.cloudus.xion.oxcs.net | 10 | 60 |
| MX | @ | mx004.cloudus.xion.oxcs.net | 10 | 60 |
| TXT | @ | v=spf1 include:spf.cloudus.xion.oxcs.net ~all | — | 60 |

The official suggested TTL is 3600; Vercel created the records with its default 60.
Its CLI requires a separate manual interactive confirmation to update a live
record's TTL. No bypass was attempted; 60 is valid and was left unchanged. Both
authoritative DNS and public resolver 1.1.1.1 returned the exact MX/SPF values.

Source: [official OX Cloud US mail integration](https://confluence-public.open-xchange.com/spaces/OASC/pages/51777224/OX+Cloud+OX+brand+Mail+integration).
The user-provided endpoints match the standard OX US endpoints. These are not the
different `.rs.oxcs.net` values found in reseller examples. If Registros supplies
tenant-specific records, those must take precedence.

Do not change nameservers or replace the zone. Before applying, recheck that no
MX/SPF has appeared since inspection and avoid duplicate SPF records. Afterward,
verify authoritative/public resolution and submit a new approved self-test. Do
not resend jobs already marked SMTP-accepted: their original delivery is unknown.

DKIM remains provider-dependent. The [official DKIM instructions](https://confluence-public.open-xchange.com/spaces/OASC/pages/359793853/OX+Cloud+DKIM+incl.+per+maildomain)
require OX/Registros to generate and activate the domain's keys. The documented
selector targets currently return NXDOMAIN; do not publish speculative keys or
claim DKIM is enabled. DMARC can be prepared after sender authentication review;
no report recipient or enforcement policy is invented here.

After propagation the user confirmed inbox receipt. Browser verification in App
Suite then covered the received verification, explicit confirmation, delivered
welcome and explicit unsubscribe. Supabase ended in `unsubscribed`, with a recorded
confirmation and exactly one welcome job. Earlier SMTP-accepted jobs were never
automatically resent; delayed original messages arrived later. Only the designated
synthetic subscription was reset for a fresh test cycle.
