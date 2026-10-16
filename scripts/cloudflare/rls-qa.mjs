// Read-only API permission checks. No response bodies, row values or keys logged.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const key=process.env.SUPABASE_PUBLIC_KEY||JSON.parse(await readFile('artifacts/web52/public-api-key.json','utf8')).key;
if(!key.startsWith('sb_publishable_'))throw Error('PUBLISHABLE_KEY_REQUIRED');
const base='https://donguccheqjqyzudowuy.supabase.co/rest/v1/';const results=[];
for(const [path,expected]of [['vector_public_roadmap?select=*',200],['vector_community_proposals?select=id',200],['vector_inquiries?select=id',403],['vector_newsletter_subscriptions?select=id',403],['vector_mail_outbox?select=id',403],['pw_v_airline_hubs?select=*',403],['pw_v_public_stats?select=*',403]]){
 const r=await fetch(base+path,{headers:{apikey:key},redirect:'manual',signal:AbortSignal.timeout(12000)});
 results.push({resource:path.split('?')[0],status:r.status,ok:expected===403?[401,403].includes(r.status):r.status===expected});await r.arrayBuffer();
}
for(const [name,body]of [['vector_community_qa_register_intent',{p_email:'patagonia@patagoniaw.com',p_token_hash:'0'.repeat(64)}],['vector_before_user_created_qa',{event:{}}]]){
 const r=await fetch(base+'rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(12000)});
 results.push({resource:name,status:r.status,ok:[401,403].includes(r.status)});await r.arrayBuffer();
}
await mkdir('artifacts/web53',{recursive:true});await writeFile('artifacts/web53/rls-http.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>!r.ok))process.exitCode=1;
