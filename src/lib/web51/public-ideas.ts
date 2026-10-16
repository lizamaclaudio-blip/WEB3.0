import 'server-only';
import {cache} from 'react';
import {inquiryConfigured} from '../web4/inquiry';
import {communityRpc} from './server';
import {uuid} from './validation';
import type {CommunityProposal} from '@/components/web4/CommunityLab';
export const getPublicProposal=cache(async(id:string):Promise<CommunityProposal|null>=>{
 if(!uuid(id)||!inquiryConfigured(process.env))return null;
 try{const result=await communityRpc('vector_community_list',{p_actor:null,p_session:null,p_id:id}) as {items:CommunityProposal[]};return result.items?.[0]??null;}catch{return null;}
});
export async function getPublicProposalIds():Promise<string[]>{
 if(!inquiryConfigured(process.env))return [];
 try{const result=await communityRpc('vector_community_list',{p_actor:null,p_session:null,p_id:null}) as {items:CommunityProposal[]};return result.items.map(item=>item.id).filter(uuid);}catch{return [];}
}
