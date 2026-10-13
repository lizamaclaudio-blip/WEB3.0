import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const inquiryModule = dataModule(await readFile(new URL('../../src/lib/web4/inquiry.ts', import.meta.url), 'utf8'));
const { validateInquiry, inquiryConfigured } = await import(inquiryModule);
const routeSource = (await readFile(new URL('../../src/app/api/vector/inquiry/route.ts', import.meta.url), 'utf8')).replace('@/lib/web4/inquiry', inquiryModule);
const { POST } = await import(dataModule(routeSource));
const valid = { kind:'interest', email:' Person@Example.com ', name:' Test ', message:'', consent:true, locale:'es', website:'' };
const request = (body, changes = {}) => new Request('http://localhost:3004/api/vector/inquiry', { method:'POST', headers: { origin:'http://localhost:3004', 'content-type':'application/json', ...changes }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('normalizes valid interest; requires explicit consent and rejects spam', () => {
 assert.deepEqual(validateInquiry(valid), { ok:true, value:{ kind:'interest', email:'person@example.com', name:'Test', message:'', consent:true, locale:'es' } });
 assert.equal(validateInquiry({...valid, consent:false}).code, 'CONSENT_REQUIRED');
 assert.equal(validateInquiry({...valid, website:'bot'}).code, 'SPAM');
 for (const change of [{email:'bad'}, {email:'x\r\n@example.com'}, {name:'x'.repeat(101)}, {message:'x'.repeat(2001)}, {locale:'xx'}, {kind:'admin'}, {kind:'contact',message:'short'}]) assert.equal(validateInquiry({...valid,...change}).ok, false);
 assert.equal(validateInquiry({...valid,kind:'contact',message:'A real technical question'}).ok,true);
});
test('forms fail closed without explicit secure configuration', () => {
 assert.equal(inquiryConfigured({}),false);
 assert.equal(inquiryConfigured({VECTOR_FORMS_ENABLED:'true', SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'test',VECTOR_FORM_HASH_SECRET:'short'}),false);
});
test('API rejects cross-origin, malformed, overlarge and unconsented requests before storage', async () => {
 assert.equal((await POST(request(valid,{origin:'https://attacker.test'}))).status,403);
 assert.equal((await POST(request(valid,{'content-type':'text/plain'}))).status,415);
 assert.equal((await POST(request('{'))).status,400);
 assert.equal((await POST(request(' '.repeat(8193)))).status,413);
 assert.equal((await POST(request({...valid,consent:false}))).status,400);
});
test('storage-confirmed success, limits and failures return honest outcomes; no raw IP in payload', async () => {
 const originalFetch = globalThis.fetch;
 const keys = ['VECTOR_FORMS_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VECTOR_FORM_HASH_SECRET','VERCEL'];
 const previous = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 Object.assign(process.env,{VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-only-key',VECTOR_FORM_HASH_SECRET:'test-only-32-character-hmac-secret',VERCEL:'1'});
 try {
  let stored;
  globalThis.fetch = async (url,options) => { assert.equal(new URL(url).pathname,'/rest/v1/rpc/vector_submit_inquiry'); stored=JSON.parse(options.body); return Response.json('accepted'); };
  assert.equal((await POST(request(valid,{'x-vercel-forwarded-for':'192.0.2.10'}))).status,201);
  assert.equal(stored.p_email,'person@example.com'); assert.match(stored.p_ip_hash,/^[a-f0-9]{64}$/); assert.equal(JSON.stringify(stored).includes('192.0.2.10'),false);
  globalThis.fetch = async () => Response.json('rate_limited'); assert.equal((await POST(request(valid))).status,429);
  globalThis.fetch = async () => Response.json('unexpected'); assert.equal((await POST(request(valid))).status,503);
  globalThis.fetch = async () => {throw new Error('offline');}; assert.equal((await POST(request(valid))).status,503);
  delete process.env.VECTOR_FORMS_ENABLED; assert.equal((await POST(request(valid))).status,503);
 } finally { globalThis.fetch=originalFetch; for(const key of keys) { if(previous[key]===undefined) delete process.env[key]; else process.env[key]=previous[key]; } }
});
