# WEB 5.3 — Final QA receipt

2026-10-16 · branch `codex/patagonia-wings-web4` · base `ab26ca0`.

QA: https://patagonia-wings-web51-qa.lizamaclaudio.workers.dev/

Final deployment `a0f64490-5a84-4030-8c91-00de204d4629`.

**LISTO SOLO PARA LANZAMIENTO INFORMATIVO.** No production deployment was performed. Dynamic/private CPU still needs optimization; public registration, automatic mail and QA invitation are closed.

Verified:

- 36 public HTML/RSC routes precompiled; 300 public CPU samples, 25 per measured route, maximum 3 ms among the measured public routes/reads.
- Private-read sampling still includes a 154 ms CPU request. No forced-cold guarantee or peak-memory measurement.
- Native TLS SMTP authenticated; one explicitly approved owner message delivered and acknowledged. Test closed afterward. Seven historical deliveries preserved.
- Owner Auth account created, email confirmed, actual session present and one proposal persisted pending moderation. Zero moderators. QA intent consumed once.
- Vote uniqueness, approved-only reading and withdrawal passed with the real identity in a rolled-back database integration transaction. Public browser voting remains pending an authorized approved idea.
- Build/TypeScript, 86 web tests, five native SMTP tests, 103 HTTP checks, nine RLS HTTP checks and 13 delivery/closure checks passed.
- 18 actual 390×844 mobile routes; desktop screenshot measured 1440×900.
- No DNS, paid plan, production, WPF, cron, pg_net, payments, giveaway or installer change. Protected Worker ETag unchanged.

Portable evidence retained in this directory:

- `cpu-summary.json`: sanitized performance samples summarized by route.
- `mobile-matrix.json`: measured dimensions and overflow checks.
- `rls-http.json`, `delivery-guards.json`: public/privileged API boundaries.
- `smtp-delivery-receipt.json`: SMTP acceptance plus subsequent owner inbox acknowledgment, headers not verified.
- `protected-worker.json`: unchanged protected Worker fingerprint.
- `home-desktop-1440x900.jpg`, `home-mobile-390x844.jpg`, `gallery-mobile-390x844.jpg`: real browser captures.

Remaining: received SPF/DKIM/DMARC headers; sustained cold/private/write CPU; moderator designation; public browser voting; legacy unaccent warning and development/CLI dependency advisories; separately reviewed production intake/SEO/Auth/DNS configuration. Hosting can remain USD 0 within Free quotas; domain/mailbox charges remain existing external costs.

Full report: `docs/WEB53-VERIFICATION.md` in the repository root.
