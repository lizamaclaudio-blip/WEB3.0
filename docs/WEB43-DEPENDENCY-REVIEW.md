# WEB 4.3 — dependency and commercial-claims review

Reviewed on 15 October 2026. This is a recorded intermediate audit, not a claim that the final dependency tree is free of vulnerabilities. The main implementation report must record any subsequent updates and repeat the audit after them.

## Dependency snapshot

The installed tree at review time contained Next.js and `eslint-config-next` 16.4.1, Nodemailer 10.1.1 and `@types/nodemailer` 8.0.2. No installation or lockfile change was performed by this review.

- `npm audit --json`: 12 affected packages — 0 critical, 9 high, 2 moderate and 1 low.
- `npm audit --omit=dev --json`: 3 affected packages — 0 critical, 1 high and 2 moderate.
- No advisory was reported against the installed Next.js or Nodemailer versions.
- Next.js 16.4.1 is the patched version for the critical [typed-array cache RCE advisory published on 14 October](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). Checking npm alone immediately after a framework security release is insufficient because advisory ingestion may lag.

The production-dependency alerts were:

| Package | Installed | Severity | Minimum patched version | Relevant use |
| --- | --- | --- | --- | --- |
| `source-map-js` | 1.2.1 | High | 1.2.2 | PostCSS/stylesheet toolchain; no application endpoint accepting source maps was found. |
| `baseline-browser-mapping` | 2.10.29 | Moderate | 2.11.0 | Next.js browser-target support. |
| `csv-parse` | 5.6.0 | Moderate | 7.0.2 | Existing OurAirports administrative importer, not the public forms API. The importer uses `columns: true`, so the advisory should not simply be dismissed. Updating requires a major-version compatibility review. |

Production dependency membership does not establish public exploitability. The versions should still be corrected where compatible. `npm update source-map-js baseline-browser-mapping` can refresh the first two within their existing ranges without adding direct dependencies.

Remaining development alerts included `@babel/core`, `browserslist`, `brace-expansion`, `js-yaml`, and the ESLint → fast-glob → micromatch → braces chain. Compatible refresh candidates are `@babel/core`, `browserslist`, `brace-expansion`, and `js-yaml`. At review time the braces advisory affected the latest 3.0.3 release. Do not use `npm audit fix --force`: the suggested ESLint downgrade to 14.2.35 does not match the installed Next.js 16 framework.

Primary references: [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [baseline-browser-mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), [csv-parse](https://github.com/advisories/GHSA-8cw4-87c7-c6xx), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Nodemailer 10.1.1 ships its own TypeScript declarations, requires Node.js 20+ and uses the MIT-0 licence, according to its [published package](https://www.npmjs.com/package/nodemailer). The application should use its bundled declarations; the separately installed v8 community types are redundant and may cause mismatches. Final build validation remains the main agent's responsibility.

## COMPLETE claims in ES / EN / FR

Static review covered `CompleteEdition.tsx`, `complete-edition.ts`, marketing/FAQ content, navigation, support and versions pages, and the locale test. All three languages consistently present:

- One planned licence for local modules, Academy and Performance.
- Academy and Performance as planned and unavailable until implemented and validated.
- The Windows application as beta/in development.
- Price and release as unannounced; no checkout, payment or reservation promise.
- A waiting-list action leading to the existing localized support form, with email updates requiring separate optional consent.

The target anchors (`#complete`, `#funcionalidades`, `#preguntas`, `#novedades`) exist. No false availability claim was found in the new COMPLETE material. Existing QA-versus-real-flight explanations remain explicit in the Landing Lab content. This review did not run a build, change WPF, access customer data, or send email.
