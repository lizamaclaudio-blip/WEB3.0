import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { readInquiryJson } from '../web4/inquiry-http';
import { authRequest, communityConfirmationUrl, communityQaRegistrationConfigured, communityRegistrationConfigured, communityResponse, communityRpc, failure, rate } from './server';
import { cleanText, email, isRecord, locale } from './validation';

export async function registerCommunity(request: Request, qaAuthorized = false) {
 const body=await readInquiryJson(request,2048);if(!body.ok)return body.response;
 const v=body.value;
 if(!isRecord(v)||v.website||v.consent!==true||!email(v.email)||!cleanText(v.password,12,128)||!locale(v.locale))return failure('INVALID_INPUT',400);
 const qa=qaAuthorized&&communityQaRegistrationConfigured()&&v.email.trim().toLowerCase()==='patagonia@patagoniaw.com';
 if((qaAuthorized&&!qa)||(!qa&&!communityRegistrationConfigured()))return failure('SERVICE_UNAVAILABLE',503);
 try{
  if(!await rate(request,'register')||!await rate(request,'register',v.email.toLowerCase()))return failure('RATE_LIMITED',429);
  const settingsResponse=await authRequest('settings');if(!settingsResponse.ok)return failure('SERVICE_UNAVAILABLE',503);
  const settings=await settingsResponse.json();
  if(settings.mailer_autoconfirm!==false||settings.disable_signup===true||settings.external?.email!==true)return failure('SERVICE_UNAVAILABLE',503);
  const redirect=communityConfirmationUrl(v.locale)!;
  const nonce=qa?randomBytes(32).toString('base64url'):undefined;
  if(nonce){
   const prepared=await communityRpc('vector_community_qa_register_intent',{p_email:v.email.trim().toLowerCase(),p_token_hash:createHash('sha256').update(nonce).digest('hex')});
   if(prepared!=='prepared')return failure('SERVICE_UNAVAILABLE',503);
  }
  const response=await authRequest('signup?redirect_to='+encodeURIComponent(redirect),{email:v.email.trim().toLowerCase(),password:v.password,data:{locale:v.locale,community_consent_version:'2026-10-community-v1',...(nonce?{qa_registration_nonce:nonce}:{})}});
  if(response.status===429)return failure('RATE_LIMITED',429);
  if(!response.ok)return failure('REGISTRATION_UNAVAILABLE',503);
  return communityResponse({ok:true,code:'VERIFICATION_REQUIRED'},202);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
