import { adminRequest } from '@/lib/web51/handlers';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return adminRequest(request);}
export async function POST(request:Request){return adminRequest(request,true);}
