import { changeVote } from '@/lib/web51/handlers';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return changeVote(request,(await params).id);}
