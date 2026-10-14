import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3005';
const results=[];
for(const path of ['/','/copiloto-vector','/soporte','/versiones','/privacidad','/condiciones','/en','/en/copiloto-vector','/en/soporte','/en/versiones','/en/privacidad','/en/condiciones','/fr','/fr/copiloto-vector','/fr/soporte','/fr/versiones','/fr/privacidad','/fr/condiciones','/robots.txt','/sitemap.xml','/icon.svg','/login','/api/auth/me','/api/acars/status']) {
 const response=await fetch(base+path,{redirect:'manual'}); const text=await response.text();
 const ok = path.startsWith('/api/') ? [200,401,403].includes(response.status) : response.status===200;
 results.push({path,status:response.status,ok,bytes:text.length});
 if(!ok) process.exitCode=1;
}
const response = await fetch(base+'/api/vector/inquiry',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({kind:'interest',email:'qa@example.test',name:'',message:'',locale:'es',consent:true,website:''})});
results.push({path:'/api/vector/inquiry',status:response.status,expected:503,ok:response.status===503});
if(response.status!==503) process.exitCode=1;
console.log(JSON.stringify(results,null,2));
await writeFile('artifacts/web4-review/http-checks.json',JSON.stringify(results,null,2));
