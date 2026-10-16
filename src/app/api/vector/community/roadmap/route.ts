import { loadPublicRoadmap } from '@/lib/web51/roadmap';
import { communityResponse } from '@/lib/web51/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return communityResponse({ok:true,...await loadPublicRoadmap()});}
