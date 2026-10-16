import 'server-only';
import { inquiryConfigured } from '../web4/inquiry';
import { readInquiryJson } from '../web4/inquiry-http';
import { actorParameters,communityActor,communityResponse,communityRpc,failure,fingerprint,rate } from './server';
import { cleanText,isRecord,uuid,validModeration,validProposal } from './validation';

export async function listProposals(request:Request,id?:string){
 if(id&&!uuid(id))return failure('NOT_FOUND',404);
 if(!inquiryConfigured(process.env))return failure('SERVICE_UNAVAILABLE',503);
 try{
  if(!await rate(request,'read'))return failure('RATE_LIMITED',429);
  const actor=await communityActor(request);
  const result=await communityRpc('vector_community_list',{p_actor:actor?.id??null,p_session:actor?.session??null,p_id:id??null}) as {items:unknown[]};
  return id&&!result.items.length?failure('NOT_FOUND',404):communityResponse(result as Record<string,unknown>);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function submitProposal(request:Request){
 const body=await readInquiryJson(request,20000);if(!body.ok)return body.response;
 if(!validProposal(body.value))return failure('INVALID_INPUT',400);
 const actor=await communityActor(request);if(!actor)return failure('UNAUTHORIZED',401);
 const v=body.value;
 try{
  const result=await communityRpc('vector_community_submit',{...actorParameters(actor),p_title:v.title.trim(),p_description:v.description.trim(),p_category:v.category,p_alias:v.alias?.trim()??'',p_hash:fingerprint(request,actor.id)});
  return result==='pending_moderation'?communityResponse({ok:true,code:'PENDING_MODERATION'},201):failure('RATE_LIMITED',429);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function changeVote(request:Request,id:string){
 const body=await readInquiryJson(request,1024);if(!body.ok)return body.response;
 if(!uuid(id)||!isRecord(body.value)||typeof body.value.vote!=='boolean')return failure('INVALID_INPUT',400);
 const actor=await communityActor(request);if(!actor)return failure('UNAUTHORIZED',401);
 try{
  const result=await communityRpc('vector_community_vote',{...actorParameters(actor),p_id:id,p_vote:body.value.vote,p_hash:fingerprint(request,actor.id)});
  return result==='saved'?communityResponse({ok:true,code:'SAVED'}):failure(result==='rate_limited'?'RATE_LIMITED':result==='merged'?'PROPOSAL_MERGED':'NOT_FOUND',result==='rate_limited'?429:result==='merged'?409:404);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function reportProposal(request:Request,id:string){
 const body=await readInquiryJson(request,5000);if(!body.ok)return body.response;
 if(!uuid(id)||!isRecord(body.value)||!cleanText(body.value.reason,10,1000))return failure('INVALID_INPUT',400);
 const actor=await communityActor(request);if(!actor)return failure('UNAUTHORIZED',401);
 try{
  const result=await communityRpc('vector_community_report',{...actorParameters(actor),p_id:id,p_reason:body.value.reason.trim(),p_hash:fingerprint(request,actor.id)});
  return result==='saved'?communityResponse({ok:true,code:'SAVED'}):failure(result==='rate_limited'?'RATE_LIMITED':'NOT_FOUND',result==='rate_limited'?429:404);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
export async function adminRequest(request:Request,write=false){
 let payload:Record<string,unknown>={};
 if(write){const body=await readInquiryJson(request,150000);if(!body.ok)return body.response;if(!validModeration(body.value))return failure('INVALID_INPUT',400);payload=body.value;}
 const actor=await communityActor(request);if(!actor)return failure('UNAUTHORIZED',401);if(!actor.admin)return failure('FORBIDDEN',403);
 try{
  if(!await rate(request,'admin',actor.id))return failure('RATE_LIMITED',429);
  const result=await communityRpc('vector_community_admin',{...actorParameters(actor),p_action:write?payload.action:'read',p_payload:payload}) as Record<string,unknown>;
  if(Array.isArray(result.items))result.items=result.items.map(item=>{const v=item as Record<string,unknown>;return {...v,createdAt:v.created_at,response:v.developer_response,mergedInto:v.merged_into};});
  return communityResponse(result);
 }catch{return failure('SERVICE_UNAVAILABLE',503);}
}
