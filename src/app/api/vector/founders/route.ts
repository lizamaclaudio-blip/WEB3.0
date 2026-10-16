import { createHmac } from 'node:crypto';
import { inquiryAddressAllowed,inquiryConfigured } from '@/lib/web4/inquiry';
import { inquiryAddressHash } from '@/lib/web4/inquiry-storage';
import { readInquiryJson } from '@/lib/web4/inquiry-http';
import { scheduleMailAfterResponse } from '@/lib/web4/mail-after';
import { communityResponse,communityRpc,failure } from '@/lib/web51/server';
import { validFounder } from '@/lib/web51/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){
 const body=await readInquiryJson(request,4096);if(!body.ok)return body.response;
 if(!validFounder(body.value))return failure('INVALID_INPUT',400);
 if(!inquiryAddressAllowed(body.value.email.trim().toLowerCase(),process.env))return failure('SERVICE_UNAVAILABLE',503);
 if(!inquiryConfigured(process.env))return failure('SERVICE_UNAVAILABLE',503);
 const v=body.value;
 try{
  const address=v.email.trim().toLowerCase();
  const result=await communityRpc('vector_founders_register',{p_email:address,p_email_hash:createHmac('sha256',process.env.VECTOR_FORM_HASH_SECRET!).update(address).digest('hex'),p_name:v.name.trim(),p_locale:v.locale,p_country:v.country?.trim()||null,p_newsletter:v.newsletterConsent===true,p_ip_hash:inquiryAddressHash(request)});
  if(result==='rate_limited')return failure('RATE_LIMITED',429);
  if(result!=='saved_pending_verification')return failure('SERVICE_UNAVAILABLE',503);
  if(v.newsletterConsent===true)scheduleMailAfterResponse();
  return communityResponse({ok:true,code:'SAVED_PENDING_VERIFICATION'},201);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
