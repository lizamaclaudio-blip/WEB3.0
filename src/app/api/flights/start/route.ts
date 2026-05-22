import { POST as startAcarsPost } from "@/app/api/acars/start/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return startAcarsPost(request);
}

