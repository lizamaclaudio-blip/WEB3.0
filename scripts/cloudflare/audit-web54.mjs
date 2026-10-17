// Read-only domain, route and TLS inventory before any DNS/publication change.
import {mkdir,writeFile} from 'node:fs/promises';
import tls from 'node:tls';
const dir='artifacts/web54';await mkdir(dir,{recursive:true});
const names=['patagoniaw.com','www.patagoniaw.com'];const dns=[];
for(const name of names)for(const type of ['NS','SOA','A','AAAA','CNAME','MX','TXT','CAA','DS']){
 const response=await fetch('https://dns.google/resolve?name='+name+'&type='+type,{signal:AbortSignal.timeout(15000)});
 const value=await response.json();dns.push({name,type,status:value.Status,authenticated:value.AD,answers:value.Answer||[]});
}
await writeFile(dir+'/dns-public-before.json',JSON.stringify(dns,null,2));
const paths=['/','/login','/register','/dashboard','/dispatch','/academy','/routes','/fleet','/flights','/acars','/downloads','/api/public/stats'];const pages=[];
for(const path of paths){
 const r=await fetch('https://www.patagoniaw.com'+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});const html=await r.text();
 pages.push({path,status:r.status,location:r.headers.get('location'),server:r.headers.get('server'),title:html.match(/<title>([^<]*)<\/title>/)?.[1],h1:html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1]?.replace(/<[^>]*>/g,'').slice(0,200),bytes:Buffer.byteLength(html)});
 if(r.headers.get('content-type')?.includes('text/html'))await writeFile(dir+'/legacy-'+(path==='/'?'home':path.slice(1).replaceAll('/','-'))+'.html',html);
}
await writeFile(dir+'/legacy-http-before.json',JSON.stringify(pages,null,2));
const certificate=await new Promise((resolve,reject)=>{const socket=tls.connect({host:'www.patagoniaw.com',port:443,servername:'www.patagoniaw.com',rejectUnauthorized:true},()=>{const c=socket.getPeerCertificate();resolve({authorized:socket.authorized,subject:c.subject,issuer:c.issuer,validFrom:c.valid_from,validTo:c.valid_to,protocol:socket.getProtocol()});socket.end();});socket.setTimeout(12000,()=>{socket.destroy();reject(Error('TLS_TIMEOUT'));});socket.on('error',()=>reject(Error('TLS_VERIFICATION_FAILED')));});
await writeFile(dir+'/tls-before.json',JSON.stringify(certificate,null,2));
console.log(JSON.stringify({pages,dns:dns.filter(r=>r.answers.length).map(r=>({name:r.name,type:r.type,answers:r.answers.map(a=>a.data)})),tls:certificate},null,2));
