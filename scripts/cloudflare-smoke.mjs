import{mkdir}from'node:fs/promises';
process.env.VECTOR_SMOKE_ORIGIN ||= 'http://127.0.0.1:3006';
process.env.VECTOR_SMOKE_REPORT='artifacts/web51-cloudflare/http-checks.json';
await mkdir('artifacts/web51-cloudflare',{recursive:true});
await import('./web4-smoke.mjs');
