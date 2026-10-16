import { readInquiryJson } from '@/lib/web4/inquiry-http';
import { authRequest,communityRegistrationConfigured,communityResponse,failure,rate } from '@/lib/web51/server';
import { cleanText,email,isRecord,locale } from '@/lib/web51/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const body=await readInquiryJson(request,2048);if(!body.ok)return body.response;
 const v=body.value;
 if(!isRecord(v)||v.website||v.consent!==true||!email(v.email)||!cleanText(v.password,12,128)||!locale(v.locale))return failure('INVALID_INPUT',400);
 if(!communityRegistrationConfigured())return failure('SERVICE_UNAVAILABLE',503);
 try{
  if(!await rate(request,'register')||!await rate(request,'register',v.email.toLowerCase()))return failure('RATE_LIMITED',429);
  const settingsResponse=await authRequest('settings');if(!settingsResponse.ok)return failure('SERVICE_UNAVAILABLE',503);
  const settings=await settingsResponse.json();
  if(settings.mailer_autoconfirm!==false||settings.disable_signup===true||settings.external?.email!==true)return failure('SERVICE_UNAVAILABLE',503);
  const response=await authRequest('signup',{email:v.email.trim().toLowerCase(),password:v.password,data:{locale:v.locale,community_consent_version:'2026-10-community-v1'}});
  // Never expose whether an address already exists or return provider tokens.
  if(response.status===429)return failure('RATE_LIMITED',429);
  if(!response.ok)return failure('REGISTRATION_UNAVAILABLE',503);
  return communityResponse({ok:true,code:'VERIFICATION_REQUIRED'},202);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
