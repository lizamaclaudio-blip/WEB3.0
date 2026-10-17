import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mkdtemp,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {exportStaticSite} from '../../scripts/cloudflare/static-site.mjs';
const source=(await readFile('scripts/cloudflare/worker-public.mjs','utf8'))
 .replace(/import publicAssets[^\n]+/,"const publicAssets={'/':'/_vector-public/index','/integraciones':'/_vector-public/integraciones'};")
 .replace(/import buildProfile[^\n]+/,"const buildProfile='informational',buildOrigin='https://patagonia-wings-web54-public.lizamaclaudio.workers.dev';");
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base='https://patagonia-wings-web54-public.lizamaclaudio.workers.dev';
const env={VECTOR_SITE_MODE:'public',VECTOR_DEPLOYMENT_STAGE:'production',ASSETS:{fetch:async()=>new Response('<html>Public content</html>',{headers:{'Set-Cookie':'NEVER_FORWARD=1'}})}};
test('informational public origin is indexable and never sets an account cookie',async()=>{
 const r=await worker.fetch(new Request(base+'/'),env);assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),null);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('x-frame-options'),'DENY');
});
test('unbound official and arbitrary hosts cannot impersonate a connected launch',async()=>{
 for(const host of ['www.patagoniaw.com','evil.example'])assert.equal((await worker.fetch(new Request('https://'+host+'/'),env)).status,421);
 const r=await worker.fetch(new Request(base+'/'),{...env,VECTOR_SITE_MODE:'preview'});assert.equal(r.status,503);assert.match(r.headers.get('x-robots-tag'),/noindex/);
});
test('public deployment rejects all private writes, mail, admin and unverified intake',async()=>{
 for(const path of ['/api/vector/community/register','/api/vector/community/qa-register','/api/vector/community/session','/api/vector/community/proposals','/api/vector/mail/dispatch','/api/vector/inquiry','/api/vector/founders','/api/auth/login']){
  const r=await worker.fetch(new Request(base+path,{method:'POST'}),env);assert.equal(r.status,403,path);assert.match(r.headers.get('cache-control'),/no-store/);
 }
 const r=await worker.fetch(new Request(base+'/api/vector/community/session'),env);assert.deepEqual(await r.json(),{ok:true,authenticated:false,admin:false,configured:false});
});
test('private account pages return to read-only community; internal asset copies are inaccessible',async()=>{
 for(const prefix of ['','/en','/fr']){const r=await worker.fetch(new Request(base+prefix+'/comunidad/cuenta'),env);assert.equal(r.status,303);assert.equal(r.headers.get('location'),prefix+'/comunidad');}
 assert.equal((await worker.fetch(new Request(base+'/_vector-public/index.html'),env)).status,404);
 assert.equal((await worker.fetch(new Request(base+'/missing'),env)).status,404);
});
test('legacy pilot routes are paused without serving legacy operations',async()=>{
 for(const path of ['/login','/register','/dashboard','/acars','/downloads']){const r=await worker.fetch(new Request(base+path),env);assert.match(await r.text(),/en pausa/);assert.match(r.headers.get('x-robots-tag'),/noindex/);}
});

test('official build serves www and redirects apex and temporary origin preserving paths',async()=>{
 const officialSource=source.replaceAll("buildOrigin='https://patagonia-wings-web54-public.lizamaclaudio.workers.dev'","buildOrigin='https://www.patagoniaw.com'");
 const {default:officialWorker}=await import('data:text/javascript;base64,'+Buffer.from(officialSource).toString('base64'));
 const officialEnv={...env,VECTOR_PUBLIC_ORIGIN:'https://www.patagoniaw.com',VECTOR_CANONICAL_REDIRECT_ENABLED:'true'};
 const page=await officialWorker.fetch(new Request('https://www.patagoniaw.com/'),officialEnv);assert.equal(page.status,200);assert.equal(page.headers.get('x-robots-tag'),null);
 for(const host of ['patagoniaw.com','patagonia-wings-web54-public.lizamaclaudio.workers.dev']){const r=await officialWorker.fetch(new Request('https://'+host+'/en/integraciones?ref=developer'),officialEnv);assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://www.patagoniaw.com/en/integraciones?ref=developer');}
});

test('cached and ranged static assets retain HTTP semantics instead of becoming 404 pages',async()=>{
 for(const status of [200,206,304,416]){
  const assetEnv={...env,ASSETS:{fetch:async()=>new Response(status===304?null:'asset',{status,headers:{ETag:'"known-asset"','Set-Cookie':'NEVER_FORWARD=1','Content-Type':'image/webp'}})}};
  const r=await worker.fetch(new Request(base+'/vector/web50/hero-aviation.webp',{headers:{'If-None-Match':'"known-asset"'}}),assetEnv);
  assert.equal(r.status,status);assert.equal(r.headers.get('etag'),'"known-asset"');assert.equal(r.headers.get('set-cookie'),null);if(status===304)assert.equal(await r.text(),'');
 }
});

test('asset-first export keeps public pages available without copying private output',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'vector-static-test-'));
 const root=pathToFileURL(directory+'/');
 try {
  for(const path of ['.next/server/app/comunidad','.open-next/assets/vector','.open-next/assets/_next/static'])await mkdir(new URL(path,root),{recursive:true});
  for(const [path,body] of Object.entries({'.next/server/app/index.html':'PUBLIC HOME','.next/server/app/comunidad/admin.html':'PRIVATE ADMIN','.next/server/app/robots.txt.body':'Sitemap: https://www.patagoniaw.com/sitemap.xml','.next/server/app/sitemap.xml.body':'PUBLIC SITEMAP','.open-next/assets/vector/test.webp':'IMAGE','.open-next/assets/_next/static/test.js':'JAVASCRIPT'}))await writeFile(new URL(path,root),body);
  await exportStaticSite(root,['/'],'https://www.patagoniaw.com');
  assert.equal(await readFile(new URL('.open-next/public-site/index.html',root),'utf8'),'PUBLIC HOME');
  const entries=await readdir(new URL('.open-next/public-site/',root),{recursive:true});
  assert(!entries.some(name=>/admin|\.rsc|_vector-public|\.env/.test(name)));
  assert.match(await readFile(new URL('.open-next/public-site/_headers',root),'utf8'),/X-Frame-Options: DENY/);
  assert.equal(await readFile(new URL('.open-next/public-site/_redirects',root),'utf8'),'');
  const config=JSON.parse(await readFile('wrangler.official.jsonc','utf8'));
  assert.equal(config.assets.run_worker_first,false);
  assert.equal(config.assets.directory,'.open-next/public-site');
 } finally {await rm(directory,{recursive:true,force:true});}
});
