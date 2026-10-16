import { reportProposal } from '@/lib/web51/handlers';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return reportProposal(request,(await params).id);}
