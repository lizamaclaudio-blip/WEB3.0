import { listProposals,submitProposal } from '@/lib/web51/handlers';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return listProposals(request);}
export const POST=submitProposal;
