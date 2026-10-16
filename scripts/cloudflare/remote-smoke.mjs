import{mkdir}from'node:fs/promises';
process.env.VECTOR_SMOKE_ORIGIN ||= 'https://patagonia-wings-web51-qa.lizamaclaudio.workers.dev';
process.env.VECTOR_SMOKE_REPORT='artifacts/web53/http-checks-final.json';
process.env.VECTOR_SMOKE_STORAGE_READY='true';
await mkdir('artifacts/web53',{recursive:true});
await import('../web4-smoke.mjs');
