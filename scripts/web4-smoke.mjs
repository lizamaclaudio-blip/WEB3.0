import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3005';
const results = [];
const pages = ['', '/copiloto-vector', '/soporte', '/versiones', '/privacidad', '/condiciones', '/confirmar-novedades', '/cancelar-novedades'];
const paths = ['','/en','/fr'].flatMap(locale => pages.map(page => locale + (page || (locale ? '' : '/'))));
for (const path of [...paths, '/robots.txt', '/sitemap.xml', '/icon.svg', '/login']) await check(path, 200);
for (const path of ['/api/auth/me','/api/acars/status']) await check(path, [401,403]);
for (const name of ['home','dispatch','monitor','weather','cabin','ground','operations','copilot','journal','replay','landing','settings','report','statistics']) await check('/vector/current/' + name + '.webp', 200, true);
for (const name of ['hero-aviation','academy','performance','studio','career','acars']) await check('/vector/web50/' + name + '.webp', 200, true);
for (const name of ['home','dispatch','operations','copilot','settings']) await check('/vector/m29/' + name + '.webp', 200, true);
for (const name of ['monitor','ofp','passengers','airport','copilot','clock']) await check('/vector/current/icons/' + name + '.webp', 200, true);
await check('/api/vector/unsubscribe', 405);
await check('/api/vector/newsletter/confirm', 405);
await check('/api/vector/mail/dispatch', 405);
await check('/api/vector/mail/verify', 405);
for (const [path,body,status] of [
  ['/api/vector/inquiry',{kind:'interest',email:'qa@example.test',name:'',message:'',locale:'fr',consent:true,newsletterConsent:false,website:''},503],
  ['/api/vector/unsubscribe',{token:'A'.repeat(43)},503],
  ['/api/vector/newsletter/confirm',{token:'A'.repeat(43)},503],
  ['/api/vector/mail/dispatch',{},401],
  ['/api/vector/mail/verify',{},401],
]) {
  const response = await fetch(base + path, {method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)});
  results.push({path,method:'POST',status:response.status,expected:status,ok:response.status===status});
}
async function check(path, expected, image=false) {
  const response = await fetch(base + path,{redirect:'manual'});
  const bytes = await response.arrayBuffer();
  const statusOK = Array.isArray(expected) ? expected.includes(response.status) : response.status===expected;
  const ok = statusOK && (!image || response.headers.get('content-type')?.includes('image/webp'));
  results.push({path,status:response.status,ok,bytes:bytes.byteLength});
}
const failed = results.filter(item=>!item.ok);
if (failed.length) process.exitCode=1;
console.log(JSON.stringify({checks:results.length,passed:results.length-failed.length,failed},null,2));
await writeFile('artifacts/web4-review/http-checks.json',JSON.stringify(results,null,2));
