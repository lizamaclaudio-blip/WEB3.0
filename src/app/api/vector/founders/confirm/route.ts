import { readInquiryJson } from '@/lib/web4/inquiry-http';
import { actorParameters,communityActor,communityResponse,communityRpc,failure } from '@/lib/web51/server';
import { isRecord } from '@/lib/web51/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function change(request:Request,withdraw:boolean){
 const body=await readInquiryJson(request,1024);if(!body.ok)return body.response;
 if(!isRecord(body.value)||(!withdraw&&body.value.consent!==true))return failure('CONSENT_REQUIRED',400);
 const actor=await communityActor(request);if(!actor)return failure('UNAUTHORIZED',401);
 try{const result=await communityRpc('vector_founders_confirm',{...actorParameters(actor),p_withdraw:withdraw});return result===(withdraw?'withdrawn':'confirmed')?communityResponse({ok:true,code:withdraw?'WITHDRAWN':'CONFIRMED'}):failure('NOT_FOUND',404);}
 catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function POST(request:Request){return change(request,false);}
export async function DELETE(request:Request){return change(request,true);}
