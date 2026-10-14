# Patagonia Wings Web 4.0

## Verified baseline

- Vercel: `web-3.0`, project `prj_MKT118EtBwBNPgSD19k1ymgi4Iuu`, verified domain `www.patagoniaw.com`.
- GitHub: `lizamaclaudio-blip/WEB3.0`, deployed commit `ccbbcd133395c1cd9922c152e0817a12993c3df2`.
- Development branch: `codex/patagonia-wings-web4`. Production and DNS are not changed.
- Local backup: sibling `patagonia-wings-web3-baseline.bundle`; a complete Git bundle of the original main branch.
- Next 16.2.6, React 19.2.4, TypeScript, App Router, Node 24. Dependencies installed with `npm ci`.
- Baseline TypeScript check passes.

## Existing services preserved

Authentication uses `src/lib/auth/service.ts`, PostgreSQL via `DATABASE_URL` / `SUPABASE_DB_URL`, and the existing HTTP-only session cookie. ACARS, reservations, economy, dispatch, registration, downloads and pilot endpoints remain in place. Supabase REST adapters also exist. Source code alone does not establish which database host the deployment currently uses. No provider migration or new account system is introduced.

## Access limitations

Vercel connector can read the project and deployment, but listing environment variables returns HTTP 403. Local Vercel CLI has no authenticated session. Supabase management is not connected in this task. Production RLS and schema cannot be certified without read access. Never claim those remote checks succeeded.

## Design system

Petroleum blue `#071A29`, surfaces `#0D273A`, jade `#12D8B1`, cyan `#29C8EB`, text `#EAF5FC`, restrained amber `#F4BD59`. Cinematic aircraft hero, editorial typography, fine instrument markings, generous spacing, real product captures and original SVG navigation graphics. Marketing CSS is namespaced to avoid changing operational dashboards. CSS transitions respect reduced motion. Public marketing supports Spanish, English and French; pilot services retain their existing language and contracts.

## Commercial boundaries

Product is a development beta, not sold or licensed by this website. No purchase, fabricated downloads, customer claims, invented metrics or partner endorsements. Integration descriptions separate implemented adapters from end-to-end certification. New intake persistence stays off unless explicitly configured after its versioned schema and permissions have been reviewed. No production migration is applied by build or runtime.

## Revised public scope
The owner subsequently paused the virtual airline and requested Vector only.
The public Home/header/footer and sitemap now expose only Vector pages in ES/EN/FR.
Legacy pilot/auth/ACARS routes and data are preserved, unlinked from public product
navigation. No production deployment or shutdown has been performed.
