import { mailWorkerAuthorized } from '@/lib/web4/mail';
import { registerCommunity } from '@/lib/web51/registration';
import { communityQaRegistrationConfigured, failure } from '@/lib/web51/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request: Request){
 if(!communityQaRegistrationConfigured()||(request.headers.get('host')||new URL(request.url).host)!=='patagonia-wings-web51-qa.lizamaclaudio.workers.dev')return failure('SERVICE_UNAVAILABLE',503);
 if(!mailWorkerAuthorized(request,process.env.VECTOR_COMMUNITY_QA_INVITE_SECRET||''))return failure('UNAUTHORIZED',401);
 return registerCommunity(request,true);
}
