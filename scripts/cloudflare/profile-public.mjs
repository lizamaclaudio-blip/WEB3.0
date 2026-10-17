// trace-v1 is the protocol used by Wrangler. No headers, bodies, queries,
// console contents or credential-bearing WebSocket URL are retained.
import {mkdir,writeFile} from 'node:fs/promises';
import {cloudflareApi,qaAccount} from './account-api.mjs';
const publicWorker='patagonia-wings-web54-public';
const label=process.argv[2]||'after';if(!/^[a-z-]+$/.test(label))throw Error('INVALID_LABEL');
const root=process.argv.includes('--official')?'https://www.patagoniaw.com':'https://'+publicWorker+'.lizamaclaudio.workers.dev';
const paths=process.argv[3]==='private'
 ? ['/comunidad/cuenta','/en/comunidad/cuenta','/fr/comunidad/cuenta','/api/vector/community/admin']
 : ['/','/en','/fr','/en/integraciones','/api/vector/community/roadmap','/api/vector/community/proposals'];
const rows=[],requests=[];let sequence=0,parseErrors=0,events=0;
const base='/accounts/'+qaAccount+'/workers/scripts/'+publicWorker+'/tails';
const tail=await cloudflareApi(base,{method:'POST',body:JSON.stringify({filters:[]})});
const socket=new WebSocket(tail.url,'trace-v1');
socket.binaryType='arraybuffer';
socket.addEventListener('message',event=>{
 try{const e=JSON.parse(typeof event.data==='string'?event.data:Buffer.from(event.data).toString('utf8'));events++;if(!e.event?.request?.url)return;const url=new URL(e.event.request.url);
  if(paths.includes(url.pathname))
   rows.push({path:url.pathname,cpuMs:e.cpuTime,wallMs:e.wallTime,outcome:e.outcome,timestamp:e.eventTimestamp,version:e.scriptVersion?.id});
 }catch{parseErrors++;}
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 await Promise.race([new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(Error('TAIL_CONNECTION_FAILED')),{once:true});}),delay(20000).then(()=>{throw Error('TAIL_CONNECT_TIMEOUT');})]);
 socket.send(JSON.stringify({debug:false}));
 async function visit(path,phase){const start=performance.now();try{const r=await fetch(root+path+'?vector_qa_sample='+label+'-'+Date.now()+'-'+sequence++,{redirect:'manual',cache:'no-store',headers:{'user-agent':'Vector-QA-route-profile'}});await r.arrayBuffer();requests.push({path,phase,status:r.status,delivery:r.headers.get('x-vector-delivery'),elapsedMs:Math.round(performance.now()-start)});}catch{requests.push({path,phase,error:'FETCH_FAILED'});}}
 await visit('/','tail-probe');await delay(1000);
 for(const path of paths)await visit(path,'first-observed');
 const rounds=process.argv[3]==='extended'?100:24;
 for(let i=0;i<rounds;i++){
  const pending=paths.filter(path=>rows.filter(row=>row.path===path).length<25);
  if(!pending.length)break;
  for(let j=0;j<pending.length;j+=2){await Promise.all(pending.slice(j,j+2).map(path=>visit(path,'warm-concurrency-2')));await delay(600);}
 }
 await delay(15000);
 const quantile=(v,p)=>v[Math.ceil(v.length*p)-1]??null;
 const summary=paths.map(path=>{const v=rows.filter(r=>r.path===path&&Number.isFinite(r.cpuMs)).map(r=>r.cpuMs).sort((a,b)=>a-b);return{path,samples:v.length,median:quantile(v,.5),p95:v.length>=20?quantile(v,.95):null,p99:v.length>=100?quantile(v,.99):null,max:v.at(-1)??null,over10:v.filter(n=>n>10).length,outcomes:[...new Set(rows.filter(r=>r.path===path).map(r=>r.outcome))],httpErrors:requests.filter(r=>r.path===path&&(r.error||r.status>=500)).length,rateLimited:requests.filter(r=>r.path===path&&r.status===429).length};});
 await mkdir('artifacts/web54',{recursive:true});await writeFile(`artifacts/web54/profile-${label}.json`,JSON.stringify({label,createdAt:new Date().toISOString(),concurrency:2,parseErrors,events,requests,rows,summary,memoryPeak:'Not exposed by Tail; limit 128 MB. First observed is not proof of a cold isolate.'},null,2));
 console.log(JSON.stringify(summary,null,2));
}finally{socket.close();await cloudflareApi(base+'/'+tail.id,{method:'DELETE'});}
// The remote Tail and output are closed/persisted. Some Node WebSocket runtime
// versions retain their close timer; this standalone CLI owns no other work.
process.exit(0);
