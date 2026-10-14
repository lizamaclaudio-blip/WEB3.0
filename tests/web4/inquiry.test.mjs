import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
async function loadModule(path, replacements = {}) {
 let source = await readFile(new URL(path, import.meta.url), 'utf8');
 for (const [reference, replacement] of Object.entries(replacements)) source = source.replaceAll(`"${reference}"`, `"${replacement}"`);
 return dataModule(source);
}
const inquiryModule = await loadModule('../../src/lib/web4/inquiry.ts');
const httpModule = await loadModule('../../src/lib/web4/inquiry-http.ts');
const storageModule = await loadModule('../../src/lib/web4/inquiry-storage.ts', {'./inquiry':inquiryModule});
const newsletterModule = await loadModule('../../src/lib/web4/newsletter.ts', {'./inquiry-storage':storageModule});
const references = {'@/lib/web4/inquiry':inquiryModule,'@/lib/web4/inquiry-http':httpModule,'@/lib/web4/inquiry-storage':storageModule,'@/lib/web4/newsletter':newsletterModule};
const { validateInquiry, inquiryConfigured, newsletterConsentVersion } = await import(inquiryModule);
const { inquiryRpc } = await import(storageModule);
const { hashUnsubscribeToken, issueUnsubscribeToken, validUnsubscribeToken } = await import(newsletterModule);
const { POST } = await import(await loadModule('../../src/app/api/vector/inquiry/route.ts', references));
const { POST: unsubscribe } = await import(await loadModule('../../src/app/api/vector/unsubscribe/route.ts', references));
const valid = { kind:'interest', email:' Person@Example.com ', name:' Test ', message:'', consent:true, locale:'es', website:'' };
const request = (body, changes = {}) => new Request('http://localhost:3004/api/vector/inquiry', { method:'POST', headers: { origin:'http://localhost:3004', 'content-type':'application/json', ...changes }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('normalizes valid interest; requires explicit consent and rejects spam', () => {
 assert.deepEqual(validateInquiry(valid), { ok:true, value:{ kind:'interest', email:'person@example.com', name:'Test', message:'', consent:true, newsletterConsent:false, locale:'es' } });
 assert.equal(validateInquiry({...valid, consent:false}).code, 'CONSENT_REQUIRED');
 assert.equal(validateInquiry({...valid, website:'bot'}).code, 'SPAM');
 for (const change of [{email:'bad'}, {email:'x\r\n@example.com'}, {email:'a\u0000@example.com'}, {email:'a\u0001@example.com'}, {name:'x'.repeat(101)}, {message:'x'.repeat(2001)}, {locale:'xx'}, {kind:'admin'}, {kind:'contact',message:'short'}]) assert.equal(validateInquiry({...valid,...change}).ok, false);
 assert.equal(validateInquiry({...valid,kind:'contact',message:'A real technical question'}).ok,true);
 assert.equal(validateInquiry({...valid,locale:'fr'}).value.locale,'fr');
 assert.equal(validateInquiry({kind:'interest',email:'optional@example.test',consent:true,locale:'en'}).value.name,'');
});

test('newsletter opt-in is independent, optional and strictly boolean in every request kind', () => {
 for (const kind of ['interest','contact']) {
  const input = {...valid,kind,message:'A real technical question'};
  assert.equal(validateInquiry(input).value.newsletterConsent,false);
  assert.equal(validateInquiry({...input,newsletterConsent:false}).value.newsletterConsent,false);
  assert.equal(validateInquiry({...input,newsletterConsent:true}).value.newsletterConsent,true);
  for (const value of ['true','on',1,null,{},[]]) assert.equal(validateInquiry({...input,newsletterConsent:value}).ok,false);
  assert.equal(validateInquiry({...input,consent:false,newsletterConsent:true}).code,'CONSENT_REQUIRED');
 }
});
test('forms fail closed without explicit secure configuration', () => {
 assert.equal(inquiryConfigured({}),false);
 assert.equal(inquiryConfigured({VECTOR_FORMS_ENABLED:'true', SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'test',VECTOR_FORM_HASH_SECRET:'short'}),false);
 const configured = {VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'test',VECTOR_FORM_HASH_SECRET:'test-only-32-character-hmac-secret'};
 assert.equal(inquiryConfigured(configured),true);
 assert.equal(inquiryConfigured({...configured,SUPABASE_SERVICE_ROLE_KEY:undefined,SUPABASE_SECRET_KEY:'sb_secret_test-only-key'}),true);
 assert.equal(inquiryConfigured({...configured,SUPABASE_SECRET_KEY:''}),true);
 assert.equal(inquiryConfigured({...configured,SUPABASE_SERVICE_ROLE_KEY:undefined,SUPABASE_SECRET_KEY:undefined}),false);
 for (const url of ['not-a-url','http://storage.example.test','https://user:secret@storage.example.test','https://storage.example.test/path','https://storage.example.test/?secret=1']) assert.equal(inquiryConfigured({...configured,SUPABASE_URL:url}),false);
});
test('RPC uses opaque secret API keys without bearer auth and preserves legacy JWT headers', async () => {
 const originalFetch = globalThis.fetch;
 const configured = {VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://storage.example.test',VECTOR_FORM_HASH_SECRET:'test-only-32-character-hmac-secret'};
 const legacy = 'eyJhbGciOiJIUzI1NiJ9.test-only.signature';
 const modern = 'sb_secret_test-only-key';
 try {
  for (const [keys,key,bearer] of [
   [{SUPABASE_SERVICE_ROLE_KEY:legacy},legacy,true],
   [{SUPABASE_SECRET_KEY:modern},modern,false],
   [{SUPABASE_SECRET_KEY:modern,SUPABASE_SERVICE_ROLE_KEY:legacy},modern,false],
   [{SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:legacy},legacy,true],
   [{SUPABASE_SERVICE_ROLE_KEY:modern},modern,false],
  ]) {
   globalThis.fetch = async (url,options) => {
    assert.equal(new URL(url).pathname,'/rest/v1/rpc/vector_submit_inquiry');
    const headers = new Headers(options.headers);
    assert.equal(headers.get('apikey'),key);
    assert.equal(headers.get('authorization'),bearer ? `Bearer ${key}` : null);
    assert.equal(headers.get('content-type'),'application/json');
    assert.equal(options.cache,'no-store');
    assert.deepEqual(JSON.parse(options.body),{p_kind:'interest'});
    return Response.json('accepted');
   };
   assert.equal(await inquiryRpc('vector_submit_inquiry',{p_kind:'interest'},{...configured,...keys}),'accepted');
  }
 } finally {globalThis.fetch=originalFetch;}
});
test('API rejects cross-origin, malformed, overlarge and unconsented requests before storage', async () => {
 assert.equal((await POST(request(valid,{origin:'https://attacker.test'}))).status,403);
 assert.equal((await POST(request(valid,{'content-type':'text/plain'}))).status,415);
 assert.equal((await POST(request(valid,{'content-type':'application/jsonp'}))).status,415);
 assert.equal((await POST(request('{'))).status,400);
 assert.equal((await POST(request(' '.repeat(8193)))).status,413);
 assert.equal((await POST(request({...valid,consent:false}))).status,400);
 assert.equal((await POST(request({...valid,email:'a\u0000@example.com'}))).status,400);
 // Next may expose an internal URL while retaining the incoming public Host.
 const forwarded = new Request('http://localhost:3000/api/vector/inquiry', { method:'POST', headers:{ host:'127.0.0.1:3005',origin:'http://127.0.0.1:3005','content-type':'application/json' }, body:JSON.stringify({...valid,consent:false}) });
 assert.equal((await POST(forwarded)).status,400);
 assert.equal((await POST(request(valid,{host:'localhost:3004',origin:'https://attacker.test'}))).status,403);
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
  assert.equal(stored.p_newsletter_consent,false); assert.equal(stored.p_newsletter_consent_version,null);
  assert.equal(stored.p_newsletter_opt_in_at,undefined); // Database owns the timestamp.
  assert.equal((await POST(request({...valid,kind:'contact',message:'A technical question',newsletterConsent:true}))).status,201);
  assert.equal(stored.p_newsletter_consent,true); assert.equal(stored.p_newsletter_consent_version,newsletterConsentVersion);
  assert.equal((await POST(request({...valid,locale:'fr'}))).status,201);
  assert.equal(stored.p_locale,'fr');
  globalThis.fetch = async () => Response.json('rate_limited'); assert.equal((await POST(request(valid))).status,429);
  globalThis.fetch = async () => Response.json('unexpected'); assert.equal((await POST(request(valid))).status,503);
  globalThis.fetch = async () => {throw new Error('offline');}; assert.equal((await POST(request(valid))).status,503);
  delete process.env.VECTOR_FORMS_ENABLED; assert.equal((await POST(request(valid))).status,503);
 } finally { globalThis.fetch=originalFetch; for(const key of keys) { if(previous[key]===undefined) delete process.env[key]; else process.env[key]=previous[key]; } }
});

test('unsubscribe issuance persists only a random token hash and fails closed without registration', async () => {
 const originalFetch = globalThis.fetch;
 const env = {VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'test',VECTOR_FORM_HASH_SECRET:'test-only-32-character-hmac-secret'};
 try {
  let stored;
  globalThis.fetch = async (url,options) => {assert.equal(new URL(url).pathname,'/rest/v1/rpc/vector_register_unsubscribe_token'); stored=JSON.parse(options.body); return Response.json('registered');};
  const issued = await issueUnsubscribeToken('a'.repeat(64),env);
  assert.equal(validUnsubscribeToken(issued.token),true);
  assert.equal(stored.p_token_hash,hashUnsubscribeToken(issued.token));
  assert.equal(JSON.stringify(stored).includes(issued.token),false);
  assert.equal(stored.p_expires_at,issued.expiresAt);
  assert.ok(Date.parse(issued.expiresAt)>Date.now()+29*24*60*60*1000);
  assert.ok(Date.parse(issued.expiresAt)<=Date.now()+30*24*60*60*1000);
  const second = await issueUnsubscribeToken('a'.repeat(64),env); assert.notEqual(second.token,issued.token);
  globalThis.fetch = async () => Response.json('not_active');
  await assert.rejects(issueUnsubscribeToken('a'.repeat(64),env));
  globalThis.fetch = async () => {throw new Error('Should not contact storage');};
  await assert.rejects(issueUnsubscribeToken('a'.repeat(64),{}));
  await assert.rejects(issueUnsubscribeToken('bad',env));
 } finally {globalThis.fetch=originalFetch;}
});

test('unsubscribe requires a valid same-origin bearer token; storage confirms one-time outcome', async () => {
 const originalFetch = globalThis.fetch;
 const keys = ['VECTOR_FORMS_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VECTOR_FORM_HASH_SECRET'];
 const previous = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const token = 'A'.repeat(43);
 try {
  Object.assign(process.env,{VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'test',VECTOR_FORM_HASH_SECRET:'test-only-32-character-hmac-secret'});
  let stored;
  globalThis.fetch = async (url,options) => {assert.equal(new URL(url).pathname,'/rest/v1/rpc/vector_unsubscribe'); stored=JSON.parse(options.body); return Response.json('unsubscribed');};
  assert.equal((await unsubscribe(request({token},{origin:'https://attacker.test'}))).status,403);
  for (const value of [null,'short','x'.repeat(44),{},123]) assert.equal((await unsubscribe(request({token:value}))).status,400);
  assert.equal((await unsubscribe(request({token,extra:'x'.repeat(1024)}))).status,413);
  const result = await unsubscribe(request({token}));
  assert.equal(result.status,200); assert.equal((await result.json()).code,'UNSUBSCRIBED');
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(stored.p_token_hash,hashUnsubscribeToken(token)); assert.equal(JSON.stringify(stored).includes(token),false);
  assert.match(stored.p_ip_hash,/^[a-f0-9]{64}$/);
  globalThis.fetch = async () => Response.json('invalid_or_expired');
  assert.equal((await unsubscribe(request({token}))).status,410);
  globalThis.fetch = async () => Response.json('rate_limited'); assert.equal((await unsubscribe(request({token}))).status,429);
  globalThis.fetch = async () => Response.json('unexpected'); assert.equal((await unsubscribe(request({token}))).status,503);
  globalThis.fetch = async () => new Response('denied',{status:403}); assert.equal((await unsubscribe(request({token}))).status,503);
  delete process.env.VECTOR_FORMS_ENABLED;
  globalThis.fetch = async () => {throw new Error('Should not contact storage');};
  assert.equal((await unsubscribe(request({token}))).status,503);
 } finally {globalThis.fetch=originalFetch;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
