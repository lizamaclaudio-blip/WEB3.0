import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {publicPaths} from './public-assets.mjs';
const origin='https://www.patagoniaw.com',pages=[],assets=new Set();
for(const path of publicPaths){
 const r=await fetch(origin+path);const html=await r.text();
 assert.equal(r.status,200,path);assert.equal(r.headers.get('x-vector-delivery'),'static-assets-first');
 assert(!r.headers.get('x-robots-tag')?.includes('noindex'));assert.equal(r.headers.get('set-cookie'),null);
 assert.equal(r.headers.get('x-frame-options'),'DENY');
 assert.equal(new URL(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).href,new URL(path,origin).href);
 for(const m of html.matchAll(/(?:src|href)="(\/(?:vector|_next\/static)\/[^"?]+)(?:\?[^"]*)?"/g))assets.add(m[1]);
 pages.push({path,status:r.status,delivery:r.headers.get('x-vector-delivery')});
}
const resources=[];
for(const path of assets){const r=await fetch(origin+path);assert.equal(r.status,200,path);resources.push({path,status:r.status,type:r.headers.get('content-type')});await r.arrayBuffer();}
const cache=[];
for(const path of [...assets].filter(p=>/\.css$|hero-aviation\.webp$/.test(p))){const first=await fetch(origin+path);const etag=first.headers.get('etag');assert(etag);const conditional=await fetch(origin+path,{headers:{'If-None-Match':etag}});assert.equal(conditional.status,304);cache.push({path,conditionalStatus:conditional.status});}
const api=[];
for(const path of ['/api/vector/availability','/api/vector/community/roadmap','/api/vector/community/proposals','/api/vector/community/session']){const r=await fetch(origin+path);const body=await r.text();const limited=r.status===429&&body.includes('1027');assert(r.status===200||limited,path);api.push({path,status:r.status,quotaExceeded:limited});}
const alternate=[];
for(const host of ['patagoniaw.com','patagonia-wings-web54-public.lizamaclaudio.workers.dev']){const r=await fetch('https://'+host+'/',{redirect:'manual'});assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag'),/noindex/);alternate.push({host,status:r.status,noindex:true});}
const evidence={checkedAt:new Date().toISOString(),origin,pages,resources,cache,api,alternate,dynamicAvailable:api.every(r=>r.status===200)};
await mkdir('artifacts/web54',{recursive:true});await writeFile('artifacts/web54/static-public-verification.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify({pages:pages.length,assets:resources.length,cache,api,alternate},null,2));
