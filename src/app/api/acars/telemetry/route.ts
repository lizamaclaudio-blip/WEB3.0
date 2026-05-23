import { POST as postLive } from "@/app/api/acars/live/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return postLive(request);
}

