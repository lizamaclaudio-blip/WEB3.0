import { listProposals } from '@/lib/web51/handlers';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return listProposals(request,(await params).id);}
