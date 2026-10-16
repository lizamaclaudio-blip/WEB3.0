import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const files={
 validation:'src/lib/web51/validation.ts',inquiry:'src/lib/web4/inquiry.ts',http:'src/lib/web4/inquiry-http.ts',storage:'src/lib/web4/inquiry-storage.ts',server:'src/lib/web51/server.ts',handlers:'src/lib/web51/handlers.ts',
 session:'src/app/api/vector/community/session/route.ts',register:'src/app/api/vector/community/register/route.ts',founders:'src/app/api/vector/founders/route.ts',confirm:'src/app/api/vector/founders/confirm/route.ts',
};
const modules={};
const mailStub=moduleUrl('export function scheduleMailAfterResponse(){globalThis.communityMailSchedules=(globalThis.communityMailSchedules||0)+1;}');
for(const [key,file]of Object.entries(files)){
 let source=await readFile(new URL('../../'+file,import.meta.url),'utf8');
 source=source.replace(/import ['"]server-only['"];?/g,'');
 const substitutions={
 './validation':'validation','../web4/inquiry':'inquiry','./inquiry':'inquiry','../web4/inquiry-storage':'storage','../web4/inquiry-http':'http','./server':'server',
 '@/lib/web4/inquiry':'inquiry','@/lib/web4/inquiry-http':'http','@/lib/web4/inquiry-storage':'storage','@/lib/web51/server':'server','@/lib/web51/validation':'validation',
 };
 for(const [name,target]of Object.entries(substitutions))if(modules[target])source=source.replaceAll('"'+name+'"',JSON.stringify(modules[target])).replaceAll("'"+name+"'",JSON.stringify(modules[target]));
 source=source.replaceAll('"@/lib/web4/mail-after"',JSON.stringify(mailStub)).replaceAll("'@/lib/web4/mail-after'",JSON.stringify(mailStub));
 modules[key]=moduleUrl(source);
}
const validation=await import(modules.validation), server=await import(modules.server), handlers=await import(modules.handlers), session=await import(modules.session), register=await import(modules.register), founders=await import(modules.founders), confirm=await import(modules.confirm);
const id='00000000-0000-4000-8000-000000000001',sid='00000000-0000-4000-8000-000000000002',idea='00000000-0000-4000-8000-000000000003';
const token=()=>Buffer.from('{"alg":"mock"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,session_id:sid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.mock';
const request=(body,path='/api/vector/community/session',cookie,method='POST')=>new Request('https://vector.example'+path,{method,headers:{origin:'https://vector.example',host:'vector.example','content-type':'application/json',...(cookie?{cookie:server.communityCookie+'='+cookie}:{})},body:JSON.stringify(body)});
function environment(t,enabled=true){
 const values={VECTOR_FORMS_ENABLED:'true',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_synthetic',VECTOR_FORM_HASH_SECRET:'x'.repeat(32),VECTOR_COMMUNITY_AUTH_ENABLED:enabled?'true':'false',VECTOR_COMMUNITY_REGISTRATION_ENABLED:'true',VECTOR_COMMUNITY_CONFIRM_ORIGIN:'https://vector.example',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_synthetic'};
 const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
 t.after(()=>{for(const[k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;});
}
function network(t,overrides={}){
 const old=globalThis.fetch;const calls=[];const activeToken=token();
 globalThis.fetch=async(url,options={})=>{
 const parsedUrl=new URL(url);const path=parsedUrl.pathname;calls.push({path,search:parsedUrl.search,body:options.body?JSON.parse(options.body):null,headers:options.headers,method:options.method,redirect:options.redirect});
  if(overrides[path])return overrides[path](options,calls);
  if(path.endsWith('/settings'))return Response.json({external:{email:true},mailer_autoconfirm:false,disable_signup:false});
  if(path.endsWith('/signup'))return Response.json({id});
  if(path.endsWith('/token'))return Response.json({access_token:activeToken,refresh_token:'NEVER_EXPOSE',expires_in:3600,user:{id,email_confirmed_at:'2026-10-01T00:00:00Z'}});
  if(path.endsWith('/user'))return options.headers.Authorization==='Bearer '+activeToken?Response.json({id,email_confirmed_at:'2026-10-01T00:00:00Z'}):Response.json({}, {status:401});
  if(path.endsWith('/logout'))return new Response(null,{status:204});
  if(path.endsWith('vector_community_rate'))return Response.json(true);
  if(path.endsWith('vector_community_identity'))return Response.json({admin:false});
  if(path.endsWith('vector_community_submit'))return Response.json('pending_moderation');
  if(path.endsWith('vector_community_vote'))return Response.json('saved');
  if(path.endsWith('vector_founders_register'))return Response.json('saved_pending_verification');
  if(path.endsWith('vector_founders_confirm'))return Response.json(JSON.parse(options.body).p_withdraw?'withdrawn':'confirmed');
  throw new Error('Unexpected synthetic request');
 };
 t.after(()=>{globalThis.fetch=old;});return {calls,activeToken};
}

test('community validation requires independent consents, valid categories, bounded data and real ISO dates',()=>{
 assert.equal(validation.validFounder({name:'Pilot',email:'qa@example.test',locale:'fr',noticeConsent:true,newsletterConsent:false}),true);
 assert.equal(validation.validFounder({name:'Pilot',email:'qa@example.test',locale:'fr',noticeConsent:false,newsletterConsent:true}),false);
 assert.equal(validation.validFounder({name:'Pilot',email:'qa@example.test',locale:'fr',noticeConsent:true,newsletterConsent:'true'}),false);
 assert.equal(validation.validProposal({title:'A useful idea',description:'A description long enough to explain the proposed improvement.',category:'other',consent:true}),true);
 assert.equal(validation.validProposal({title:'A useful idea',description:'A description long enough to explain the proposed improvement.',category:'unknown',consent:true}),false);
 assert.equal(validation.validLaunchDate('2026-02-30'),false);assert.equal(validation.validLaunchDate(null),true);assert.equal(validation.validLaunchDate('2026-12-01'),true);
 assert.equal(validation.validRoadmap([{}]),false);
});

test('community RPC and Auth reject redirects without forwarding credentials',async t=>{
 environment(t);const net=network(t,{'/rest/v1/rpc/vector_community_rate':()=>new Response(null,{status:302,headers:{location:'https://untrusted.example'}}),'/auth/v1/settings':()=>new Response(null,{status:302,headers:{location:'https://untrusted.example'}})});
 await assert.rejects(server.communityRpc('vector_community_rate',{}),/UNAVAILABLE/);
 assert.equal((await server.authRequest('settings')).status,302);
 assert.equal(net.calls.length,2);assert.ok(net.calls.every(c=>c.redirect==='manual'));
});

test('Founders QA restriction rejects real addresses before storage',async t=>{
 environment(t);const old=process.env.VECTOR_QA_FORMS_ONLY;process.env.VECTOR_QA_FORMS_ONLY='true';
 t.after(()=>{if(old===undefined)delete process.env.VECTOR_QA_FORMS_ONLY;else process.env.VECTOR_QA_FORMS_ONLY=old;});
 const net=network(t);const response=await founders.POST(request({name:'Pilot',email:'owner@patagoniaw.com',locale:'es',noticeConsent:true,newsletterConsent:false},'/api/vector/founders'));
 assert.equal(response.status,503);assert.equal(net.calls.length,0);
});
test('disabled account configuration accepts no passwords and calls no provider',async t=>{
 environment(t,false);const {calls}=network(t);
 const response=await session.POST(request({email:'qa@example.test',password:'SyntheticPass123'}));assert.equal(response.status,503);assert.equal(calls.length,0);
});
test('login verifies issuer identity plus active DB session and returns only a secure HttpOnly cookie',async t=>{
 environment(t);const {calls}=network(t);
 const response=await session.POST(request({email:'qa@example.test',password:'SyntheticPass123',actor:'forged'}));
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=3600/);
 const result=await response.json();assert.deepEqual(result,{ok:true,authenticated:true,admin:false});assert.equal(JSON.stringify(result).includes('token'),false);
 assert.ok(calls.some(c=>c.path.endsWith('/user')));assert.ok(calls.some(c=>c.path.endsWith('vector_community_identity')&&c.body.p_actor===id&&c.body.p_session===sid));
});
test('forged and unverified identities cannot reach community writes or moderator actions',async t=>{
 environment(t);const {calls}=network(t);
 const response=await handlers.submitProposal(request({title:'A useful idea',description:'A description long enough to explain the proposed improvement.',category:'other',consent:true},'/api/vector/community/proposals',token()+'.forged'));
 assert.equal(response.status,401);assert.ok(!calls.some(c=>c.path.endsWith('vector_community_submit')));
 const ordinary=await handlers.adminRequest(new Request('https://vector.example/api/vector/community/admin',{headers:{cookie:server.communityCookie+'='+token()}}));
 assert.equal(ordinary.status,403);assert.ok(!calls.some(c=>c.path.endsWith('vector_community_admin')));
});
test('verified proposal and vote actors always come from the cookie, never submitted identifiers',async t=>{
 environment(t);const {calls,activeToken}=network(t);
 const response=await handlers.submitProposal(request({title:'A useful idea',description:'A description long enough to explain the proposed improvement.',category:'other',alias:'QA',consent:true,p_actor:'spoof'},'/api/vector/community/proposals',activeToken));
 assert.equal(response.status,201);const submission=calls.find(c=>c.path.endsWith('vector_community_submit'));assert.equal(submission.body.p_actor,id);assert.equal(submission.body.p_session,sid);
 const vote=await handlers.changeVote(request({vote:false,p_actor:'spoof'},'/api/vector/community/proposals/'+idea+'/vote',activeToken,'PUT'),idea);assert.equal(vote.status,200);assert.equal(calls.find(c=>c.path.endsWith('vector_community_vote')).body.p_vote,false);
 const invalid=await handlers.changeVote(request({vote:'false'},'/api/vector/community/proposals/'+idea+'/vote',activeToken,'PUT'),idea);assert.equal(invalid.status,400);
});
test('unconfirmed provider identity cannot write even with a structurally valid token',async t=>{
 environment(t);const {calls,activeToken}=network(t,{'/auth/v1/user':()=>Response.json({id,email_confirmed_at:null})});
 const response=await handlers.changeVote(request({vote:true},'/api/vector/community/proposals/'+idea+'/vote',activeToken,'PUT'),idea);
 assert.equal(response.status,401);assert.ok(!calls.some(c=>c.path.endsWith('vector_community_vote')));
});
test('moderator administration uses its own rate scope and maps only verified server results',async t=>{
 environment(t);const {calls,activeToken}=network(t,{
  '/rest/v1/rpc/vector_community_identity':()=>Response.json({admin:true}),
  '/rest/v1/rpc/vector_community_admin':options=>Response.json(JSON.parse(options.body).p_action==='read'?{ok:true,items:[{id:idea,title:'QA',created_at:'2026-10-01',developer_response:'QA reply'}],roadmap:[],launchDate:null}:{ok:true,code:'SAVED'}),
 });
 const response=await handlers.adminRequest(new Request('https://vector.example/api/vector/community/admin',{headers:{cookie:server.communityCookie+'='+activeToken}}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.items[0].response,'QA reply');assert.ok(calls.some(c=>c.path.endsWith('vector_community_rate')&&c.body.p_scope==='admin'));
 const write=await handlers.adminRequest(request({action:'moderate',id:idea,status:'evaluacion',response:'Synthetic review',published:true,hidden:false,featured:false},'/api/vector/community/admin',activeToken),true);
 assert.equal(write.status,200);assert.ok(calls.some(c=>c.path.endsWith('vector_community_admin')&&c.body.p_actor===id&&c.body.p_action==='moderate'));
});
test('signup refuses unverified-provider configuration and never echoes provider secrets',async t=>{
 environment(t);const {calls}=network(t,{'/auth/v1/settings':()=>Response.json({external:{email:true},mailer_autoconfirm:true})});
 const response=await register.POST(request({email:'qa@example.test',password:'SyntheticPass123',consent:true,locale:'en'},'/api/vector/community/register'));
 assert.equal(response.status,503);assert.ok(!calls.some(c=>c.path.endsWith('/signup')));
});

test('signup cannot open without a fixed HTTPS confirmation origin',async t=>{
 environment(t);const {calls}=network(t);delete process.env.VECTOR_COMMUNITY_CONFIRM_ORIGIN;
 assert.equal((await register.POST(request({email:'qa@example.test',password:'SyntheticPass123',consent:true,locale:'en'},'/api/vector/community/register'))).status,503);
 assert.equal(calls.length,0);
 for(const bad of ['http://vector.example','https://user:pass@vector.example','https://vector.example/path','https://vector.example/?next=evil'])assert.equal(server.communityConfirmationUrl('en',{VECTOR_COMMUNITY_CONFIRM_ORIGIN:bad}),null);
});

test('prepared signup returns only verification-required and chooses the localized server-controlled return URL',async t=>{
 environment(t);const {calls}=network(t);
 const response=await register.POST(request({email:'qa@example.test',password:'SyntheticPass123',consent:true,locale:'fr',redirect:'https://evil.example'},'/api/vector/community/register'));
 assert.equal(response.status,202);assert.deepEqual(await response.json(),{ok:true,code:'VERIFICATION_REQUIRED'});
 const signup=calls.find(call=>call.path.endsWith('/signup'));
 assert.equal(new URLSearchParams(signup.search).get('redirect_to'),'https://vector.example/fr/comunidad/cuenta');
 assert.equal(signup.body.data.locale,'fr');
});
test('Founders notice-only storage schedules no commercial mail and stores separate explicit consent',async t=>{
 environment(t);const {calls}=network(t);globalThis.communityMailSchedules=0;
 const response=await founders.POST(request({name:'QA Pilot',email:'qa@example.test',locale:'es',noticeConsent:true,newsletterConsent:false},'/api/vector/founders'));
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,code:'SAVED_PENDING_VERIFICATION'});assert.equal(globalThis.communityMailSchedules,0);
 const stored=calls.find(c=>c.path.endsWith('vector_founders_register')).body;assert.equal(stored.p_newsletter,false);assert.match(stored.p_email_hash,/^[a-f0-9]{64}$/);assert.match(stored.p_ip_hash,/^[a-f0-9]{64}$/);
});
test('Founders confirmation and withdrawal need verified identity; POST needs explicit consent',async t=>{
 environment(t);const {activeToken}=network(t);
 assert.equal((await confirm.POST(request({consent:true},'/api/vector/founders/confirm'))).status,401);
 assert.equal((await confirm.POST(request({consent:false},'/api/vector/founders/confirm',activeToken))).status,400);
 assert.equal((await confirm.POST(request({consent:true},'/api/vector/founders/confirm',activeToken))).status,200);
 assert.equal((await confirm.DELETE(request({},'/api/vector/founders/confirm',activeToken,'DELETE'))).status,200);
});
test('logout validates origin, revokes provider session and clears the secure cookie',async t=>{
 environment(t);const {calls,activeToken}=network(t);
 const response=await session.DELETE(request({},'/api/vector/community/session',activeToken,'DELETE'));
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);assert.ok(calls.some(c=>c.path.endsWith('/logout')));
 const hostile=new Request('https://vector.example/api/vector/community/session',{method:'DELETE',headers:{origin:'https://hostile.example','content-type':'application/json'},body:'{}'});
 assert.equal((await session.DELETE(hostile)).status,403);
});
