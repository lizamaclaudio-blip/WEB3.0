import { readInquiryJson } from '@/lib/web4/inquiry-http';
import { authRequest,communityActor,communityAuthConfigured,communityCookie,communityResponse,cookieToken,failure,rate,sessionCookie } from '@/lib/web51/server';
import { cleanText,email,isRecord } from '@/lib/web51/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const actor=await communityActor(request);return communityResponse({ok:true,authenticated:!!actor,admin:actor?.admin??false,configured:communityAuthConfigured()});}
export async function POST(request:Request){
 const body=await readInquiryJson(request,2048);if(!body.ok)return body.response;
 if(!isRecord(body.value)||body.value.website||!email(body.value.email)||!cleanText(body.value.password,1,128))return failure('INVALID_INPUT',400);
 if(!communityAuthConfigured())return failure('SERVICE_UNAVAILABLE',503);
 try{
  if(!await rate(request,'login')||!await rate(request,'login',body.value.email.toLowerCase()))return failure('RATE_LIMITED',429);
  const response=await authRequest('token?grant_type=password',{email:body.value.email.trim().toLowerCase(),password:body.value.password});
  if(!response.ok)return failure('AUTH_FAILED',401);
  const session=await response.json();
  if(!session.user?.email_confirmed_at)return failure('EMAIL_UNVERIFIED',403);
  const token=session.access_token;
  if(typeof token!=='string'||token.length>8192)return failure('SERVICE_UNAVAILABLE',503);
  const probe=new Request(request.url,{headers:{...Object.fromEntries(request.headers),cookie:communityCookie+'='+token}});
  const actor=await communityActor(probe);if(!actor)return failure('AUTH_FAILED',401);
  const result=communityResponse({ok:true,authenticated:true,admin:actor.admin});
  result.headers.set('Set-Cookie',sessionCookie(token,Number(session.expires_in)||3600));return result;
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function DELETE(request:Request){
 const body=await readInquiryJson(request,1024);if(!body.ok)return body.response;
 const token=cookieToken(request);
 let revoked=true;
 if(token){try{const response=await authRequest('logout?scope=local',{},token);revoked=response.ok;}catch{revoked=false;}}
 // The DB checks auth.sessions for every write; no credential is exposed.
 const result=communityResponse(revoked?{ok:true}:{ok:false,code:'SIGNOUT_NOT_CONFIRMED'},revoked?200:503);result.headers.set('Set-Cookie',sessionCookie('',0));return result;
}
