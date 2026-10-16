import 'server-only';
import { inquiryConfigured } from '../web4/inquiry';
import { communityRpc } from './server';
import { validLaunchDate,validRoadmap } from './validation';
import { publicRoadmapSeed,type PublicRoadmapItem } from '@/components/web4/public-roadmap';
export async function loadPublicRoadmap():Promise<{items:PublicRoadmapItem[];launchDate:string|null;source:'database'|'reviewed-seed'}>{
 if(inquiryConfigured(process.env))try{
  const data=await communityRpc('vector_community_roadmap',{}) as {items:unknown;launchDate:unknown};
  if(validRoadmap(data.items)&&validLaunchDate(data.launchDate))return {items:data.items as unknown as PublicRoadmapItem[],launchDate:data.launchDate as string|null,source:'database'};
 }catch{/* Fall back only to documented reviewed content, never fabricated progress. */}
 return {items:publicRoadmapSeed,launchDate:null,source:'reviewed-seed'};
}
