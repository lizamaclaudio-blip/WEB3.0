import 'server-only';
import { createHmac } from 'node:crypto';
import { inquiryConfigured } from '../web4/inquiry';
import { inquiryAddressHash } from '../web4/inquiry-storage';
import { uuid } from './validation';

type Environment=Record<string,string|undefined>;
export const communityCookie='__Host-pv-community';
function publicAuthKey(env:Environment){
 const key=(env.VECTOR_COMMUNITY_PUBLIC_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'').trim();
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return key;
 try{if(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)&&JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8')).role==='anon')return key;}catch{/* Reject malformed or privileged keys. */}
 return null;
}
export function communityAuthConfigured(env:Environment=process.env){return inquiryConfigured(env)&&env.VECTOR_COMMUNITY_AUTH_ENABLED==='true'&&!!publicAuthKey(env);}
export function communityRegistrationConfigured(env:Environment=process.env){return communityAuthConfigured(env)&&env.VECTOR_COMMUNITY_REGISTRATION_ENABLED==='true';}
export function fingerprint(request:Request,suffix='',env:Environment=process.env){return createHmac('sha256',env.VECTOR_FORM_HASH_SECRET!).update('community:'+inquiryAddressHash(request,env)+':'+suffix).digest('hex');}
export async function communityRpc(name:string,parameters:Record<string,unknown>,env:Environment=process.env):Promise<unknown>{
 if(!inquiryConfigured(env)||!/^vector_(community|founders)_[a-z_]+$/.test(name)) throw new Error('UNAVAILABLE');
 const key=(env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY)!;
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
 if(!key.startsWith('sb_secret_')) headers.Authorization='Bearer '+key;
 const response=await fetch(new URL('/rest/v1/rpc/'+name,env.SUPABASE_URL),{method:'POST',headers,body:JSON.stringify(parameters),signal:AbortSignal.timeout(8000),cache:'no-store',redirect:'error'});
 if(!response.ok) throw new Error('UNAVAILABLE');
 return response.json();
}
export async function authRequest(path:string,body?:unknown,token?:string,env:Environment=process.env){
 if(!communityAuthConfigured(env)) throw new Error('UNAVAILABLE');
 const headers:Record<string,string>={apikey:publicAuthKey(env)!,'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 return fetch(new URL('/auth/v1/'+path,env.SUPABASE_URL),{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000),cache:'no-store',redirect:'error'});
}
export function cookieToken(request:Request){
 const match=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(communityCookie+'='));
 const token=match?.slice(communityCookie.length+1);
 return token&&token.length<8192&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)?token:null;
}
export type CommunityActor={id:string;session:string;admin:boolean;token:string};
export async function communityActor(request:Request,env:Environment=process.env):Promise<CommunityActor|null>{
 const token=cookieToken(request); if(!token||!communityAuthConfigured(env))return null;
 try{
  const response=await authRequest('user',undefined,token,env);
  if(!response.ok)return null;
  const user=await response.json();
  if(!uuid(user.id)||!user.email_confirmed_at)return null;
  // Auth has verified this token with its issuer before any claim is used.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
  if(!uuid(claims.session_id)||claims.sub!==user.id||claims.role!=='authenticated'||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000)return null;
  const identity=await communityRpc('vector_community_identity',{p_actor:user.id,p_session:claims.session_id},env) as {admin:boolean};
  return {id:user.id,session:claims.session_id,admin:identity.admin===true,token};
 }catch{return null;}
}
export function communityResponse(body:Record<string,unknown>,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});}
export const failure=(code:string,status:number)=>communityResponse({ok:false,code},status);
export function actorParameters(actor:CommunityActor){return {p_actor:actor.id,p_session:actor.session};}
export async function rate(request:Request,scope:string,suffix='',env:Environment=process.env){return await communityRpc('vector_community_rate',{p_scope:scope,p_hash:fingerprint(request,suffix,env)},env)===true;}
export function sessionCookie(token:string,maxAge=3600){return `${communityCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0,Math.min(3600,Math.floor(maxAge)))}`;}
