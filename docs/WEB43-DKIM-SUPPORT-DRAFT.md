# Draft for Registros support — not sent

Subject: Enable per-domain DKIM for the active OX Cloud US email service

Hello,

The Email Profesional Empresas service for patagoniaw.com is active and uses
smtp.us.appsuite.cloud. Its authoritative DNS is hosted on Vercel. The four
official OX Cloud US MX records and SPF are published, and receipt, verification,
welcome and unsubscribe tests now work.

Please confirm the service's recommended DNS records and generate/activate
per-maildomain DKIM for patagoniaw.com. The documented selector targets below
currently return NXDOMAIN:

- selector1-patagoniaw-com._domainkey.oxcloud.zone
- selector2-patagoniaw-com._domainkey.oxcloud.zone

Please provide the exact two CNAME records to publish and confirm when the
provider-side keys/signing are enabled. No mailbox password or provisioning
credential should be included in a support reply.

Reference: [official OX per-maildomain DKIM instructions](https://confluence-public.open-xchange.com/spaces/OASC/pages/359793853/OX+Cloud+DKIM+incl.+per+maildomain).

Thank you.
